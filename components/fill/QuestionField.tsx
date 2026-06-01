"use client";

import type { Question } from "@/lib/schema";
import styles from "./fill.module.css";

/**
 * Renders the input for one question, by type. Controlled — value + onChange
 * are owned by the reducer in FillExperience. `onEnter` advances on the
 * keyboard-first path (text/email/number); selects advance on click.
 */
export function QuestionField({
  question,
  value,
  onChange,
  onEnter,
  autoFocus,
}: {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  onEnter: () => void;
  autoFocus?: boolean;
}) {
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnter();
    }
  };

  switch (question.type) {
    case "short_text":
    case "email":
      return (
        <input
          className={styles.input}
          type={question.type === "email" ? "email" : "text"}
          inputMode={question.type === "email" ? "email" : "text"}
          placeholder={
            question.type === "email" ? "name@email.com" : "Type your answer"
          }
          value={(value as string) ?? ""}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
        />
      );

    case "number":
      return (
        <input
          className={styles.input}
          type="number"
          inputMode="decimal"
          placeholder="Type a number"
          value={value === undefined || value === null ? "" : String(value)}
          autoFocus={autoFocus}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
          onKeyDown={handleKey}
        />
      );

    case "long_text":
      return (
        <textarea
          className={styles.input}
          placeholder="Type your answer"
          value={(value as string) ?? ""}
          autoFocus={autoFocus}
          rows={4}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Enter inserts a newline in long text; Cmd/Ctrl+Enter advances.
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onEnter();
            }
          }}
        />
      );

    case "yes_no":
      return (
        <div className={`${styles.options} ${styles.optionsRow}`}>
          {[
            { label: "Yes", val: true },
            { label: "No", val: false },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              className={`${styles.option} ${
                value === opt.val ? styles.optionSelected : ""
              }`}
              style={{ flex: "0 0 auto", minWidth: 120, justifyContent: "center" }}
              onClick={() => {
                onChange(opt.val);
                onEnter();
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );

    case "single_select":
      return (
        <div className={styles.options}>
          {question.options.map((opt, i) => (
            <button
              key={opt.label}
              type="button"
              className={`${styles.option} ${
                value === opt.label ? styles.optionSelected : ""
              }`}
              onClick={() => {
                onChange(opt.label);
                onEnter();
              }}
            >
              <span className={styles.optionKey}>{letter(i)}</span>
              {opt.label}
            </button>
          ))}
        </div>
      );

    case "multi_select": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className={styles.options}>
          {question.options.map((opt, i) => {
            const isOn = selected.includes(opt.label);
            return (
              <button
                key={opt.label}
                type="button"
                className={`${styles.option} ${isOn ? styles.optionSelected : ""}`}
                onClick={() =>
                  onChange(
                    isOn
                      ? selected.filter((s) => s !== opt.label)
                      : [...selected, opt.label],
                  )
                }
              >
                <span className={styles.optionKey}>{isOn ? "✓" : letter(i)}</span>
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }
  }
}

function letter(i: number): string {
  return String.fromCharCode(65 + (i % 26));
}
