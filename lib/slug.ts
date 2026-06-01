/**
 * Public slug generation (ENGINEERING_PLAN decision 4): an unguessable,
 * url-safe nanoid generated server-side at publish, with a UNIQUE index and
 * collision retry. Lowercase alphanumerics keep the share URL clean and
 * unambiguous; 18 chars is comfortably unguessable.
 */
import { customAlphabet } from "nanoid";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const SLUG_LENGTH = 18;

const nano = customAlphabet(ALPHABET, SLUG_LENGTH);

export function generateSlug(): string {
  return nano();
}
