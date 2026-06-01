/**
 * Core of the trust boundary, extracted from the route handler so it can be
 * tested directly against a real (RLS-subject) anon Supabase client without a
 * Next request context. The route handler (app/api/.../route.ts) is a thin
 * adapter around this.
 *
 * Guards, in order: rate limit → published-form load → per-form cap → Zod
 * validation against the form's own schema → insert (with schema snapshot).
 * The DB-layer RLS WITH CHECK is the second, independent guard on the insert.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAnswerValidator, type Question } from "@/lib/schema";
import {
  checkRateLimit,
  sweepRateLimit,
  PER_FORM_RESPONSE_CAP,
} from "@/lib/rate-limit";

export interface SubmitInput {
  slug: string;
  rateLimitKey: string;
  userAgent: string | null;
  answers: unknown;
}

export interface SubmitResult {
  status: number;
  body: Record<string, unknown>;
  retryAfter?: number;
}

export async function handleSubmit(
  supabase: SupabaseClient,
  input: SubmitInput,
): Promise<SubmitResult> {
  // 1. Rate limit (best-effort; the cap below is the durable guard).
  sweepRateLimit();
  const rl = checkRateLimit(input.rateLimitKey);
  if (!rl.ok) {
    return {
      status: 429,
      body: { error: "Too many submissions. Please wait a moment." },
      retryAfter: rl.retryAfter,
    };
  }

  if (
    input.answers === undefined ||
    input.answers === null ||
    typeof input.answers !== "object"
  ) {
    return { status: 400, body: { error: "Missing answers." } };
  }

  // 2. Load the PUBLISHED form by slug (anon RLS only exposes published forms).
  const { data: form, error: formError } = await supabase
    .from("forms")
    .select("id, schema, status")
    .eq("public_slug", input.slug)
    .eq("status", "published")
    .maybeSingle();

  if (formError) {
    return {
      status: 500,
      body: { error: "Something went wrong. Please try again." },
    };
  }
  if (!form) {
    return {
      status: 404,
      body: { error: "This form is closed or no longer exists." },
    };
  }

  const questions = form.schema as Question[];

  // 3. Per-form cap (durable). Counted via SECURITY DEFINER RPC.
  const { data: count, error: countError } = await supabase.rpc(
    "published_form_response_count",
    { p_slug: input.slug },
  );
  if (countError) {
    return {
      status: 500,
      body: { error: "Something went wrong. Please try again." },
    };
  }
  if (typeof count === "number" && count >= PER_FORM_RESPONSE_CAP) {
    return {
      status: 429,
      body: { error: "This form has reached its response limit." },
    };
  }

  // 4. Validate against THIS form's generated schema validator.
  const parsed = buildAnswerValidator(questions).safeParse(input.answers);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: "Some answers need attention.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  // 5. Snapshot schema + insert. RLS WITH CHECK re-verifies published-only.
  const { error: insertError } = await supabase.from("responses").insert({
    form_id: form.id,
    answers: parsed.data,
    schema_snapshot: questions,
    meta: { ua: input.userAgent },
  });

  if (insertError) {
    if (insertError.code === "42501") {
      return {
        status: 409,
        body: { error: "This form just closed. Your answers weren't submitted." },
      };
    }
    return {
      status: 500,
      body: { error: "Couldn't save your response. Please try again." },
    };
  }

  return { status: 201, body: { ok: true } };
}
