/**
 * Stable, url-safe question ids. Generated when a question is added in the
 * builder; they key the answer map and the per-response schema snapshot, so
 * they must match the QuestionId regex in lib/schema/questions.ts.
 */
import { customAlphabet } from "nanoid";

const nano = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  10,
);

export function generateQuestionId(): string {
  return `q${nano()}`;
}
