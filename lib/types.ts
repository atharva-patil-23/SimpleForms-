/**
 * Row shapes for the three tables. Hand-written (small + stable) rather than
 * generated, so there's no codegen step in the loop. Keep in sync with
 * supabase/migrations.
 */
import type { Question } from "./schema/questions";

export type FormStatus = "draft" | "published";

export interface Form {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  schema: Question[];
  status: FormStatus;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormResponse {
  id: string;
  form_id: string;
  answers: Record<string, unknown>;
  schema_snapshot: Question[];
  meta: Record<string, unknown>;
  submitted_at: string;
}
