"use client";

/**
 * The one-question-at-a-time respondent experience (ENGINEERING_PLAN T7,
 * decision 6: hand-rolled useReducer, not react-hook-form — one field mounted
 * at a time). Keyboard-first: Enter advances. Required-empty blocks advance.
 * On network failure the answers are preserved in the reducer so a retry loses
 * nothing.
 */
import { useReducer, useCallback } from "react";
import { buildAnswerValidator, type Question } from "@/lib/schema";
import { QuestionField } from "./QuestionField";
import styles from "./fill.module.css";

type Phase = "filling" | "submitting" | "done" | "closed";

interface State {
  index: number;
  answers: Record<string, unknown>;
  error: string | null;
  phase: Phase;
}

type Action =
  | { type: "SET_ANSWER"; id: string; value: unknown }
  | { type: "ERROR"; message: string }
  | { type: "NEXT"; total: number }
  | { type: "BACK" }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_DONE" }
  | { type: "SUBMIT_CLOSED" }
  | { type: "SUBMIT_FAIL"; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_ANSWER":
      return {
        ...state,
        answers: { ...state.answers, [action.id]: action.value },
        error: null,
      };
    case "ERROR":
      return { ...state, error: action.message };
    case "NEXT":
      return {
        ...state,
        index: Math.min(state.index + 1, action.total - 1),
        error: null,
      };
    case "BACK":
      return { ...state, index: Math.max(state.index - 1, 0), error: null };
    case "SUBMIT_START":
      return { ...state, phase: "submitting", error: null };
    case "SUBMIT_DONE":
      return { ...state, phase: "done", error: null };
    case "SUBMIT_CLOSED":
      return { ...state, phase: "closed" };
    case "SUBMIT_FAIL":
      return { ...state, phase: "filling", error: action.message };
    default:
      return state;
  }
}

export function FillExperience({
  slug,
  title,
  questions,
}: {
  slug: string;
  title: string;
  questions: Question[];
}) {
  const total = questions.length;
  const [state, dispatch] = useReducer(reducer, {
    index: 0,
    answers: {},
    error: null,
    phase: "filling",
  });

  const current = questions[state.index];
  const isLast = state.index === total - 1;

  const submit = useCallback(
    async (answers: Record<string, unknown>) => {
      dispatch({ type: "SUBMIT_START" });
      try {
        const res = await fetch(`/api/forms/${slug}/responses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        if (res.status === 201) {
          dispatch({ type: "SUBMIT_DONE" });
          return;
        }
        if (res.status === 404 || res.status === 409) {
          dispatch({ type: "SUBMIT_CLOSED" });
          return;
        }
        const data = await res.json().catch(() => ({}));
        dispatch({
          type: "SUBMIT_FAIL",
          message:
            data.error ?? "Something went wrong. Your answers are still here — try again.",
        });
      } catch {
        // Network failure — answers stay in the reducer, retry is safe.
        dispatch({
          type: "SUBMIT_FAIL",
          message: "Couldn't reach the server. Your answers are saved — try again.",
        });
      }
    },
    [slug],
  );

  // Validate just the current question by generating a one-field validator.
  const advance = useCallback(() => {
    if (!current) return;
    const single = buildAnswerValidator([current]);
    const result = single.safeParse({ [current.id]: state.answers[current.id] });
    if (!result.success) {
      const msg =
        result.error.flatten().fieldErrors[current.id]?.[0] ??
        "Please check this answer.";
      dispatch({ type: "ERROR", message: msg });
      return;
    }
    if (isLast) {
      submit(state.answers);
    } else {
      dispatch({ type: "NEXT", total });
    }
  }, [current, state.answers, isLast, submit, total]);

  // --- terminal states ----------------------------------------------------
  if (state.phase === "done") {
    return (
      <div className={styles.root}>
        <div className={styles.progress}>
          <div className={styles.progressBar} style={{ width: "100%" }} />
        </div>
        <Nav title={title} step={null} />
        <div className={styles.centered}>
          <div className={styles.check}>✓</div>
          <div className={styles.bigTitle}>Thanks — that&rsquo;s submitted.</div>
          <div className={styles.bigSub}>
            Your response was recorded. You can close this tab.
          </div>
        </div>
        <Footer title={title} />
      </div>
    );
  }

  if (state.phase === "closed") {
    return (
      <div className={styles.root}>
        <Nav title={title} step={null} />
        <div className={styles.centered}>
          <div className={styles.bigTitle}>This form is closed.</div>
          <div className={styles.bigSub}>
            It&rsquo;s no longer accepting responses. Reach out to whoever shared it
            with you.
          </div>
        </div>
        <Footer title={title} />
      </div>
    );
  }

  // --- filling ------------------------------------------------------------
  const pct = total === 0 ? 0 : (state.index / total) * 100;

  return (
    <div className={styles.root}>
      <div className={styles.progress}>
        <div className={styles.progressBar} style={{ width: `${pct}%` }} />
      </div>
      <Nav title={title} step={`${state.index + 1} of ${total}`} />

      <div className={styles.stage}>
        <div className={`${styles.card} ${styles.enter}`} key={current.id}>
          <div className={styles.qhead}>
            <span className={styles.num}>{state.index + 1}.</span>
            <h1 className={styles.title}>
              {current.title}
              {current.required ? (
                <span style={{ color: "var(--cobalt)" }}> *</span>
              ) : null}
            </h1>
          </div>
          {current.description ? (
            <p className={styles.sub}>{current.description}</p>
          ) : null}

          <div className={styles.field}>
            <QuestionField
              question={current}
              value={state.answers[current.id]}
              onChange={(value) =>
                dispatch({ type: "SET_ANSWER", id: current.id, value })
              }
              onEnter={advance}
              autoFocus
            />
          </div>

          {state.error ? <div className={styles.error}>{state.error}</div> : null}

          <div className={styles.field}>
            <div className={styles.row}>
              <button
                type="button"
                className={styles.cta}
                onClick={advance}
                disabled={state.phase === "submitting"}
              >
                {state.phase === "submitting"
                  ? "Submitting…"
                  : isLast
                    ? "Submit →"
                    : "Continue →"}
              </button>
              {!isLast ? (
                <div className={styles.hint}>
                  or press <b>Enter ↵</b>
                </div>
              ) : null}
              {state.index > 0 ? (
                <button
                  type="button"
                  className={styles.back}
                  onClick={() => dispatch({ type: "BACK" })}
                >
                  ← Back
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Footer title={title} />
    </div>
  );
}

function Nav({ title, step }: { title: string; step: string | null }) {
  return (
    <div className={styles.nav}>
      <div className={styles.mark}>
        <span className={styles.markDot} />
        SimpleForms
      </div>
      {step ? <div className={styles.step}>{step}</div> : null}
      {!step ? <div className={styles.step}>{title}</div> : null}
    </div>
  );
}

function Footer({ title }: { title: string }) {
  return (
    <div className={styles.foot}>
      {title} · made with{" "}
      <a href="/" target="_blank" rel="noreferrer">
        SimpleForms
      </a>
    </div>
  );
}
