/**
 * E2E auth helper. We can't drive Google OAuth headlessly, so we mint a real
 * Supabase session the same way the app would: create a confirmed user via the
 * admin API, then sign in through the @supabase/ssr server client backed by an
 * in-memory cookie jar. The captured cookie is injected into the Playwright
 * browser context, giving us a genuinely authenticated session (RLS in full
 * effect) without the OAuth redirect.
 */
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { BrowserContext } from "@playwright/test";

function readStack() {
  const out = execSync("npx supabase status -o env", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const env: Record<string, string> = {};
  for (const line of out.split("\n")) {
    const m = line.match(/^(\w+)="?(.*?)"?$/);
    if (m) env[m[1]] = m[2];
  }
  return {
    url: env.API_URL,
    anon: env.ANON_KEY,
    service: env.SERVICE_ROLE_KEY,
  };
}

const stack = readStack();

export interface Creator {
  email: string;
  userId: string;
  cookies: { name: string; value: string }[];
}

let counter = 0;

/** Create a confirmed user and capture their session cookies. */
export async function createCreator(label = "creator"): Promise<Creator> {
  const email = `${label}-${Date.now()}-${counter++}@e2e.local`;
  const password = "e2e-password-123!";

  const admin = createClient(stack.url, stack.service, {
    auth: { persistSession: false },
  });
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;

  const jar: Record<string, string> = {};
  const sb = createServerClient(stack.url, stack.anon, {
    cookies: {
      getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })),
      setAll: (list: { name: string; value: string }[]) =>
        list.forEach(({ name, value }) => (jar[name] = value)),
    },
  });
  const { error: signInErr } = await sb.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) throw signInErr;

  return {
    email,
    userId: data.user!.id,
    cookies: Object.entries(jar).map(([name, value]) => ({ name, value })),
  };
}

/** Inject a creator's session cookies into a Playwright context (localhost). */
export async function applySession(
  context: BrowserContext,
  creator: Creator,
): Promise<void> {
  await context.addCookies(
    creator.cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })),
  );
}

/** Service-role client for assertions/seeding from tests. */
export function serviceClient() {
  return createClient(stack.url, stack.service, {
    auth: { persistSession: false },
  });
}
