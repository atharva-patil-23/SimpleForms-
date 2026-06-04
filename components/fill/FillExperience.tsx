"use client";

/**
 * The one-question-at-a-time respondent experience (ENGINEERING_PLAN T7,
 * decision 6: hand-rolled useReducer, not react-hook-form — one field mounted
 * at a time). Keyboard-first: Enter advances. Required-empty blocks advance.
 * On network failure the answers are preserved in the reducer so a retry loses
 * nothing.
 */
import { useReducer, useCallback, useEffect, useRef, useState } from "react";
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
  | { type: "SUBMIT_FAIL"; message: string }
  | { type: "RESET" };

const INITIAL: State = { index: 0, answers: {}, error: null, phase: "filling" };

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
    case "RESET":
      return INITIAL;
    default:
      return state;
  }
}

const THEMES = new Set(["light", "dark", "auto"]);

export function FillExperience({
  slug,
  title,
  questions,
  embed = false,
  theme = "light",
  successMessage = null,
  redirectUrl = null,
}: {
  slug: string;
  title: string;
  questions: Question[];
  embed?: boolean;
  theme?: "light" | "dark" | "auto";
  successMessage?: string | null;
  redirectUrl?: string | null;
}) {
  const total = questions.length;
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const current = questions[state.index];
  const isLast = state.index === total - 1;

  // Only ever navigate to an http(s) URL (defense-in-depth; also validated on
  // save). Anything else is ignored.
  const safeRedirect =
    redirectUrl && /^https?:\/\//i.test(redirectUrl.trim())
      ? redirectUrl.trim()
      : null;

  // Theme: set data-theme on <html> so dark tokens cascade to the whole
  // document (body background included). Also accept live theme changes from a
  // host page via postMessage — so an embedder can re-sync when their site's
  // theme toggles. Restores the prior value on unmount so leaving the fill page
  // never strands another route in a theme it wasn't built for.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const prev = el.getAttribute("data-theme");
    el.setAttribute("data-theme", theme);
    function onThemeMsg(e: MessageEvent) {
      const next = (e.data as { type?: string; theme?: string } | null)?.theme;
      if (
        (e.data as { type?: string } | null)?.type === "simpleforms:theme" &&
        typeof next === "string" &&
        THEMES.has(next)
      ) {
        el.setAttribute("data-theme", next);
      }
    }
    window.addEventListener("message", onThemeMsg);
    return () => {
      window.removeEventListener("message", onThemeMsg);
      if (prev) el.setAttribute("data-theme", prev);
      else el.removeAttribute("data-theme");
    };
  }, [theme]);

  // Autofocus is blocked for cross-origin iframes until the user interacts, and
  // attempting it logs a console warning. So in embed mode we don't autofocus
  // until the first pointer/key event; after that, later fields focus normally.
  // Standalone starts "engaged" so the first field focuses as before.
  const [engaged, setEngaged] = useState(!embed);
  useEffect(() => {
    if (!embed || engaged) return;
    const mark = () => setEngaged(true);
    window.addEventListener("pointerdown", mark, { once: true });
    window.addEventListener("keydown", mark, { once: true });
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
    };
  }, [embed, engaged]);

  // Embed mode: report our content height to the parent page so its <iframe>
  // can resize to fit (no scrollbars, no fixed-height guessing). Re-measured on
  // every content change via ResizeObserver, and re-bound when the phase/index
  // changes (those swap the root element). Height-only message → safe to post.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!embed) return;
    const el = rootRef.current;
    if (!el || typeof window === "undefined") return;
    const post = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      window.parent?.postMessage(
        { type: "simpleforms:resize", slug, height },
        "*",
      );
    };
    post();
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(post) : null;
    ro?.observe(el);
    window.addEventListener("load", post);
    return () => {
      ro?.disconnect();
      window.removeEventListener("load", post);
    };
  }, [embed, slug, state.phase, state.index]);

  const rootClass = embed ? `${styles.root} ${styles.rootEmbed}` : styles.root;

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
          // Owner-configured redirect (validated http(s) on save). Brief beat on
          // the success screen, then navigate the current context (the iframe,
          // when embedded).
          if (safeRedirect) {
            setTimeout(() => {
              window.location.assign(safeRedirect);
            }, 900);
          }
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
    [slug, safeRedirect],
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
    // Owner's custom message wins. Otherwise a sensible default that doesn't
    // tell an embedded visitor to "close this tab" (they're on someone's site).
    const body =
      successMessage?.trim() ||
      (safeRedirect
        ? "Taking you back…"
        : embed
          ? "Your response was recorded."
          : "Your response was recorded. You can close this tab.");
    return (
      <div className={rootClass} ref={rootRef}>
        <div className={styles.progress}>
          <div className={styles.progressBar} style={{ width: "100%" }} />
        </div>
        {embed ? null : <Nav title={title} step={null} />}
        <div className={styles.centered}>
          <div className={styles.check}>✓</div>
          <div className={styles.bigTitle}>Thanks — that&rsquo;s submitted.</div>
          <div className={styles.bigSub}>{body}</div>
          {!safeRedirect ? (
            <button
              type="button"
              className={styles.submitAnother}
              onClick={() => {
                setEngaged(!embed);
                dispatch({ type: "RESET" });
              }}
            >
              Submit another response
            </button>
          ) : null}
        </div>
        <Footer title={title} embed={embed} />
      </div>
    );
  }

  if (state.phase === "closed") {
    return (
      <div className={rootClass} ref={rootRef}>
        {embed ? null : <Nav title={title} step={null} />}
        <div className={styles.centered}>
          <div className={styles.bigTitle}>This form is closed.</div>
          <div className={styles.bigSub}>
            It&rsquo;s no longer accepting responses. Reach out to whoever shared it
            with you.
          </div>
        </div>
        <Footer title={title} embed={embed} />
      </div>
    );
  }

  // --- filling ------------------------------------------------------------
  const pct = total === 0 ? 0 : (state.index / total) * 100;

  return (
    <div className={rootClass} ref={rootRef}>
      <div className={styles.progress}>
        <div className={styles.progressBar} style={{ width: `${pct}%` }} />
      </div>
      {embed ? null : <Nav title={title} step={`${state.index + 1} of ${total}`} />}

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
              autoFocus={engaged}
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

      <Footer title={title} embed={embed} />
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

function Footer({ title, embed = false }: { title: string; embed?: boolean }) {
  // In an embed the host page provides its own context, so we drop the form
  // title and show a prominent bottom-right pill badge (logo + wordmark) that
  // opens SimpleForms in a new tab — the attribution / soft-marketing surface.
  if (embed) {
    return (
      <div className={styles.badgeWrap}>
        <a
          className={styles.badge}
          href="/"
          target="_blank"
          rel="noreferrer"
          aria-label="Made with SimpleForms"
        >
          <span className={styles.badgeMark} />
          Made with <span className={styles.badgeName}>SimpleForms</span>
        </a>
      </div>
    );
  }
  return (
    <div className={styles.foot}>
      {title} · made with{" "}
      <a href="/" target="_blank" rel="noreferrer">
        SimpleForms
      </a>
    </div>
  );
}
