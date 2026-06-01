import { defineConfig, devices } from "@playwright/test";
import { execSync } from "node:child_process";

/**
 * E2E config (ENGINEERING_PLAN T12). Boots the app via `next dev` pointed at
 * the local `supabase start` stack, reading the stack's keys from
 * `supabase status` (they vary by CLI version). The full create -> publish ->
 * fill -> submit -> results loop and userA/userB isolation run against this.
 *
 * Prereq: `npx supabase start` must be running.
 */
function supabaseEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const out = execSync("npx supabase status -o env", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    for (const line of out.split("\n")) {
      const m = line.match(/^(\w+)="?(.*?)"?$/);
      if (!m) continue;
      const [, key, value] = m;
      if (key === "API_URL") env.NEXT_PUBLIC_SUPABASE_URL = value;
      if (key === "ANON_KEY") env.NEXT_PUBLIC_SUPABASE_ANON_KEY = value;
    }
  } catch {
    // Surfaced clearly when the dev server fails to find its env.
  }
  env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  return env;
}

const env = supabaseEnv();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npx next dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env,
  },
});
