"use client";

/**
 * The builder editor (ENGINEERING_PLAN T8/T9, decision 14: "plain but tidy",
 * smoke-tested). A document-style authoring surface keeping the markdown
 * metaphor visible — `#` title, `N.` numbering, monospace type tags, and a
 * "press / to add a question" affordance. Schema is validated server-side on
 * save (decision 3); publishing mints the nanoid slug (decision 4).
 */
import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  QUESTION_TYPES,
  TYPE_TAG,
  type QuestionType,
} from "@/lib/schema";
import {
  saveForm,
  publishForm,
  unpublishForm,
  deleteForm,
} from "@/lib/actions/forms";
import { generateQuestionId } from "@/lib/qid";
import shell from "./app.module.css";
import styles from "@/app/forms/[id]/editor.module.css";

export interface EditQuestion {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: { label: string }[];
}

interface Props {
  formId: string;
  initialTitle: string;
  initialDescription: string;
  initialQuestions: EditQuestion[];
  status: "draft" | "published";
  slug: string | null;
}

const SELECT_TYPES: QuestionType[] = ["single_select", "multi_select"];

function defaultQuestion(type: QuestionType): EditQuestion {
  const base: EditQuestion = {
    id: generateQuestionId(),
    type,
    title: "",
    required: false,
  };
  if (SELECT_TYPES.includes(type)) base.options = [{ label: "" }];
  return base;
}

export function FormEditor({
  formId,
  initialTitle,
  initialDescription,
  initialQuestions,
  status: initialStatus,
  slug: initialSlug,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [questions, setQuestions] = useState<EditQuestion[]>(initialQuestions);
  const [status, setStatus] = useState(initialStatus);
  const [slug, setSlug] = useState(initialSlug);

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Empty on the server and the first client render (so the share link
  // hydrates without a mismatch), upgraded to the absolute origin after mount.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  // Mark dirty whenever content changes so we can show "unsaved".
  const dirty = useRef(false);
  const markDirty = () => {
    dirty.current = true;
    if (saveState === "saved") setSaveState("idle");
  };

  // "/" opens the add menu when not typing into a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      const typing =
        el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setAddOpen(true);
      }
      if (e.key === "Escape") setAddOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function update(id: string, patch: Partial<EditQuestion>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    markDirty();
  }
  function addQuestion(type: QuestionType) {
    setQuestions((qs) => [...qs, defaultQuestion(type)]);
    setAddOpen(false);
    markDirty();
  }
  function removeQuestion(id: string) {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
    markDirty();
  }
  function cycleType(id: string, type: QuestionType) {
    const order = QUESTION_TYPES;
    const next = order[(order.indexOf(type) + 1) % order.length];
    const patch: Partial<EditQuestion> = { type: next };
    if (SELECT_TYPES.includes(next)) {
      const q = questions.find((x) => x.id === id);
      if (!q?.options || q.options.length === 0) patch.options = [{ label: "" }];
    }
    update(id, patch);
  }

  function serialize() {
    return questions.map((q) => {
      const out: Record<string, unknown> = {
        id: q.id,
        type: q.type,
        title: q.title,
        required: q.required,
      };
      if (q.description) out.description = q.description;
      if (SELECT_TYPES.includes(q.type)) {
        out.options = (q.options ?? []).filter((o) => o.label.trim() !== "");
      }
      return out;
    });
  }

  async function doSave(): Promise<boolean> {
    setSaveState("saving");
    setError(null);
    const res = await saveForm({
      id: formId,
      title,
      description: description || null,
      schema: serialize(),
    });
    if (res.ok) {
      setSaveState("saved");
      dirty.current = false;
      return true;
    }
    setSaveState("error");
    setError(res.error);
    return false;
  }

  async function doPublish() {
    setBusy(true);
    const saved = await doSave();
    if (!saved) {
      setBusy(false);
      return;
    }
    const res = await publishForm(formId);
    if (res.ok) {
      setStatus("published");
      setSlug(res.slug);
    } else {
      setError(res.error);
    }
    setBusy(false);
  }

  async function doUnpublish() {
    setBusy(true);
    await unpublishForm(formId);
    setStatus("draft");
    setBusy(false);
  }

  async function doDelete() {
    if (!window.confirm("Delete this form and all its responses? This can't be undone."))
      return;
    setBusy(true);
    await deleteForm(formId);
  }

  const shareUrl = slug ? `${origin}/f/${slug}` : null;

  return (
    <main className={shell.main}>
      <div className={shell.toprow}>
        <span className={shell.crumb}>
          {status === "published" ? "Published" : "Draft"} ·{" "}
          {questions.length} {questions.length === 1 ? "question" : "questions"}
          {dirty.current ? " · unsaved" : ""}
        </span>
        <div className={shell.topActions}>
          {error ? <span className={styles.errorNote}>{error}</span> : null}
          {!error && saveState === "saved" ? (
            <span className={styles.saveNote}>Saved ✓</span>
          ) : null}
          <button
            className="btn-ghost"
            onClick={doSave}
            disabled={busy || saveState === "saving"}
          >
            {saveState === "saving" ? "Saving…" : "Save"}
          </button>
          {status === "published" ? (
            <button className="btn-ghost" onClick={doUnpublish} disabled={busy}>
              Unpublish
            </button>
          ) : (
            <button className="btn-primary" onClick={doPublish} disabled={busy}>
              Publish →
            </button>
          )}
        </div>
      </div>

      <div className={shell.doc}>
        <div className={shell.page}>
          <div className={styles.titleRow}>
            <span className={styles.hash}>#</span>
            <input
              className={styles.titleInput}
              value={title}
              placeholder="Untitled form"
              onChange={(e) => {
                setTitle(e.target.value);
                markDirty();
              }}
            />
          </div>
          <input
            className={styles.descInput}
            value={description}
            placeholder="Add a short description…"
            onChange={(e) => {
              setDescription(e.target.value);
              markDirty();
            }}
          />

          {questions.map((q, i) => (
            <QuestionRow
              key={q.id}
              index={i}
              q={q}
              onUpdate={(patch) => update(q.id, patch)}
              onRemove={() => removeQuestion(q.id)}
              onCycleType={() => cycleType(q.id, q.type)}
            />
          ))}

          <div className={styles.add}>
            <button className={styles.addBtn} onClick={() => setAddOpen((o) => !o)}>
              Press <b>/</b> to add a question…
            </button>
            {addOpen ? (
              <div className={styles.addMenu}>
                {QUESTION_TYPES.map((t) => (
                  <button
                    key={t}
                    className={styles.addMenuItem}
                    onClick={() => addQuestion(t)}
                  >
                    {TYPE_LABEL[t]}
                    <span className={styles.addMenuTag}>{TYPE_TAG[t]}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {status === "published" && shareUrl ? (
            <div className={styles.shareBox}>
              <div className={styles.saveNote} style={{ marginBottom: 6 }}>
                Share link
              </div>
              <a className={styles.shareUrl} href={shareUrl} target="_blank" rel="noreferrer">
                {shareUrl}
              </a>
            </div>
          ) : null}

          <div style={{ marginTop: 40 }}>
            <button
              className={styles.qDelete}
              style={{ fontSize: 13 }}
              onClick={doDelete}
              disabled={busy}
            >
              Delete form
            </button>
            <button
              className="btn-ghost"
              style={{ marginLeft: 8 }}
              onClick={() => router.push("/dashboard")}
            >
              ← All forms
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

const TYPE_LABEL: Record<QuestionType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  email: "Email",
  number: "Number",
  yes_no: "Yes / No",
  single_select: "Single select",
  multi_select: "Multi select",
};

function QuestionRow({
  index,
  q,
  onUpdate,
  onRemove,
  onCycleType,
}: {
  index: number;
  q: EditQuestion;
  onUpdate: (patch: Partial<EditQuestion>) => void;
  onRemove: () => void;
  onCycleType: () => void;
}) {
  const isSelect = SELECT_TYPES.includes(q.type);
  return (
    <div className={styles.q}>
      <div className={styles.qhead}>
        <span className={styles.qnum}>{index + 1}.</span>
        <input
          className={styles.qtitle}
          value={q.title}
          placeholder="Ask a question…"
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
        <button
          className={styles.typeTag}
          onClick={onCycleType}
          title="Click to change type"
        >
          {TYPE_TAG[q.type]}
        </button>
        <button className={styles.qDelete} onClick={onRemove} title="Remove">
          ×
        </button>
      </div>

      {!isSelect ? (
        <div className={styles.previewLine}>{previewPlaceholder(q.type)}</div>
      ) : (
        <OptionsEditor q={q} onUpdate={onUpdate} />
      )}

      <div className={styles.qControls}>
        <label className={styles.req}>
          <input
            type="checkbox"
            checked={q.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
          />
          Required
        </label>
      </div>
    </div>
  );
}

function OptionsEditor({
  q,
  onUpdate,
}: {
  q: EditQuestion;
  onUpdate: (patch: Partial<EditQuestion>) => void;
}) {
  const options = q.options ?? [];
  function setOption(i: number, label: string) {
    const next = options.map((o, idx) => (idx === i ? { label } : o));
    onUpdate({ options: next });
  }
  return (
    <div className={styles.options}>
      {options.map((o, i) => (
        <div className={styles.optRow} key={i}>
          <input
            className={styles.optInput}
            value={o.label}
            placeholder={`Option ${i + 1}`}
            onChange={(e) => setOption(i, e.target.value)}
          />
          {options.length > 1 ? (
            <button
              className={styles.optRemove}
              onClick={() =>
                onUpdate({ options: options.filter((_, idx) => idx !== i) })
              }
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
      <button
        className={styles.optAdd}
        onClick={() => onUpdate({ options: [...options, { label: "" }] })}
      >
        + Add option
      </button>
    </div>
  );
}

function previewPlaceholder(type: QuestionType): string {
  switch (type) {
    case "short_text":
      return "Short answer…";
    case "long_text":
      return "Long answer…";
    case "email":
      return "name@email.com";
    case "number":
      return "A number…";
    case "yes_no":
      return "Yes / No";
    default:
      return "Answer…";
  }
}
