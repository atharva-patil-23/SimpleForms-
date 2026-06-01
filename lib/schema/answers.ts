/**
 * Runtime answer validation (ENGINEERING_PLAN decision 3). Given a form's
 * stored questions, `buildAnswerValidator` returns a Zod schema for *that
 * form's* answers — enforcing required-ness, per-type shape, email format,
 * number range, and valid select options. Used both at submit (the trust
 * boundary) and could be reused client-side.
 *
 * The answer map is keyed by question id. Unknown keys are rejected (`strict`)
 * so a respondent can't smuggle in answers to questions that don't exist.
 */
import { z } from "zod";
import type { Question } from "./questions";

/**
 * Build a per-field validator for one question. Returns the Zod type; required
 * vs optional is applied by the caller so the "missing key" message is uniform.
 */
function fieldValidator(q: Question): z.ZodTypeAny {
  switch (q.type) {
    case "short_text": {
      let s = z.string().trim().min(1, "This field is required");
      if (q.maxLength) s = s.max(q.maxLength, `Max ${q.maxLength} characters`);
      return s;
    }
    case "long_text": {
      let s = z.string().trim().min(1, "This field is required");
      if (q.maxLength) s = s.max(q.maxLength, `Max ${q.maxLength} characters`);
      return s;
    }
    case "email":
      return z.string().trim().email("Enter a valid email address");
    case "number": {
      let n = z.number({ invalid_type_error: "Enter a number" });
      if (q.min !== undefined) n = n.min(q.min, `Must be at least ${q.min}`);
      if (q.max !== undefined) n = n.max(q.max, `Must be at most ${q.max}`);
      return n;
    }
    case "yes_no":
      return z.boolean({ invalid_type_error: "Choose yes or no" });
    case "single_select": {
      const allowed = q.options.map((o) => o.label);
      return z.enum(allowed as [string, ...string[]], {
        errorMap: () => ({ message: "Choose one of the options" }),
      });
    }
    case "multi_select": {
      const allowed = new Set(q.options.map((o) => o.label));
      const { minSelections, maxSelections } = q;
      let arr: z.ZodTypeAny = z
        .array(z.string())
        .refine((vals) => vals.every((v) => allowed.has(v)), {
          message: "Contains an option that doesn't exist",
        })
        .refine((vals) => new Set(vals).size === vals.length, {
          message: "Duplicate selection",
        });
      if (minSelections !== undefined) {
        arr = arr.refine((vals: string[]) => vals.length >= minSelections, {
          message: `Choose at least ${minSelections}`,
        });
      }
      if (maxSelections !== undefined) {
        arr = arr.refine((vals: string[]) => vals.length <= maxSelections, {
          message: `Choose at most ${maxSelections}`,
        });
      }
      return arr;
    }
  }
}

/**
 * Whether an answer value counts as "empty" for a non-required question. Empty
 * optional answers are dropped before validation so they don't trip the
 * per-type rules (e.g. an empty string failing email format).
 */
function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Build a Zod schema validating the full answer map for a form. The result
 * parses an object keyed by question id; required questions must be present and
 * valid, optional ones may be omitted, and unknown keys are rejected.
 */
export function buildAnswerValidator(questions: Question[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const q of questions) {
    const field = fieldValidator(q);
    shape[q.id] = q.required
      ? field
      : z.preprocess((v) => (isEmpty(v) ? undefined : v), field.optional());
  }

  // `.strict()` → reject answer keys that don't correspond to a question.
  return z.object(shape).strict();
}

export type AnswerMap = Record<string, unknown>;
