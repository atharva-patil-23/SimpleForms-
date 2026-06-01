import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // RLS integration tests talk to a local `supabase start` stack; keep them
    // serial so they don't race on shared rows.
    fileParallelism: false,
  },
});
