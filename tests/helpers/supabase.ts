/**
 * Test helpers for talking to a local `supabase start` stack. The local CLI
 * uses well-known deterministic demo keys; we fall back to them so the tests
 * run with zero env setup, but env vars win if present (e.g. CI).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";

// Default local-dev demo keys printed by `supabase start`.
export const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

export const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxNzk5NTM1NjAwfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

/** Anon client — no session. Models a public respondent. */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Service-role client — bypasses RLS. Used ONLY in tests for setup/teardown. */
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Create a confirmed auth user and return an authed client acting as them. */
export async function createUserClient(
  email: string,
): Promise<{ client: SupabaseClient; userId: string }> {
  const admin = serviceClient();
  const password = "test-password-123!";

  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (createErr) throw createErr;
  const userId = created.user!.id;

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) throw signInErr;

  return { client, userId };
}

/** Unique email per test run so reruns don't collide. */
export function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
}
