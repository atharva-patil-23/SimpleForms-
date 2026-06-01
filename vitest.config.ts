import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

/**
 * The integration suites (RLS, submit) talk to the local `supabase start`
 * stack, whose anon/service keys vary by CLI version. Read them once here (the
 * main process, before workers spawn) and inject via test.env so workers get
 * them — unless the env already provides them (e.g. CI). If the stack is down,
 * we leave env unset; the unit suite still runs and the integration suites
 * surface a clear connection error.
 */
function supabaseEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  if (process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return env;
  }
  try {
    const out = execSync("npx supabase status -o env", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    for (const line of out.split("\n")) {
      const m = line.match(/^(\w+)="?(.*?)"?$/);
      if (!m) continue;
      const [, key, value] = m;
      if (key === "ANON_KEY") env.SUPABASE_ANON_KEY = value;
      if (key === "SERVICE_ROLE_KEY") env.SUPABASE_SERVICE_ROLE_KEY = value;
      if (key === "API_URL") env.SUPABASE_URL = value;
    }
  } catch {
    // Stack not running — fine for the unit suite.
  }
  return env;
}

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: supabaseEnv(),
    // RLS integration tests share rows in the local stack; keep them serial.
    fileParallelism: false,
  },
});
