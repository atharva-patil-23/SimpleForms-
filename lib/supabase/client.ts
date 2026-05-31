/**
 * Browser-side Supabase client (for client components).
 *
 * One factory module owns every way the app talks to Supabase (ENGINEERING_PLAN
 * decision 7). There is intentionally NO service-role key anywhere in the app:
 * the anon key + RLS is the entire authz story for v1.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
