/**
 * Question definitions — the single source of truth for a form's shape
 * (ENGINEERING_PLAN decision 3). `QuestionSchema` is a discriminated union on
 * `type`; the TS types are inferred from it so there is exactly one definition
 * to keep in sync. The runtime answer-validator (./answers.ts) is generated
 * FROM a form's stored questions, so a form validates against its own schema.
 */
import { z } from "zod";

/** The v1 question types (design doc: keep it tiny). */
export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "email",
  "number",
  "yes_no",
  "single_select",
  "multi_select",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

/** The monospace "type tag" shown in the builder/design (e.g. `short-text`). */
export const TYPE_TAG: Record<QuestionType, string> = {
  short_text: "short-text",
  long_text: "long-text",
  email: "email",
  number: "number",
  yes_no: "yes/no",
  single_select: "select",
  multi_select: "multi-select",
};

// A question id is a short stable key. We never trust client-supplied answer
// keys without checking them against these ids (see buildAnswerValidator).
const QuestionId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "question id must be url-safe");

const baseFields = {
  id: QuestionId,
  title: z.string().trim().min(1, "question text is required").max(300),
  description: z.string().trim().max(500).optional(),
  required: z.boolean().default(false),
};

const Option = z.object({
  // Options are referenced by value in answers; keep them human-readable but bounded.
  label: z.string().trim().min(1).max(200),
});

const ShortText = z.object({
  ...baseFields,
  type: z.literal("short_text"),
  maxLength: z.number().int().positive().max(5000).optional(),
});

const LongText = z.object({
  ...baseFields,
  type: z.literal("long_text"),
  maxLength: z.number().int().positive().max(20000).optional(),
});

const Email = z.object({
  ...baseFields,
  type: z.literal("email"),
});

const NumberQ = z.object({
  ...baseFields,
  type: z.literal("number"),
  min: z.number().optional(),
  max: z.number().optional(),
});

const YesNo = z.object({
  ...baseFields,
  type: z.literal("yes_no"),
});

const SingleSelect = z.object({
  ...baseFields,
  type: z.literal("single_select"),
  options: z.array(Option).min(1, "add at least one option").max(50),
});

const MultiSelect = z.object({
  ...baseFields,
  type: z.literal("multi_select"),
  options: z.array(Option).min(1, "add at least one option").max(50),
  minSelections: z.number().int().nonnegative().optional(),
  maxSelections: z.number().int().positive().optional(),
});

export const QuestionSchema = z.discriminatedUnion("type", [
  ShortText,
  LongText,
  Email,
  NumberQ,
  YesNo,
  SingleSelect,
  MultiSelect,
]);

export type Question = z.infer<typeof QuestionSchema>;
export type SelectQuestion = z.infer<typeof SingleSelect | typeof MultiSelect>;

/**
 * A whole form's ordered question list. Enforces unique ids — duplicate ids
 * would make the answer map ambiguous. Empty is allowed at the schema level;
 * the builder separately blocks publishing a 0-question form.
 */
export const FormSchema = z
  .array(QuestionSchema)
  .max(100)
  .superRefine((questions, ctx) => {
    const seen = new Set<string>();
    questions.forEach((q, i) => {
      if (seen.has(q.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate question id: ${q.id}`,
          path: [i, "id"],
        });
      }
      seen.add(q.id);
    });
  });

/** Parse + validate questions coming from the builder before save. */
export function parseFormSchema(input: unknown): Question[] {
  return FormSchema.parse(input);
}
