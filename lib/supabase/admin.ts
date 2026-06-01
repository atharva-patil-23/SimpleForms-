/**
 * Service-role Supabase client — SERVER ONLY.
 *
 * This is the one place the app holds elevated privileges. It exists solely so
 * a signed-in user can delete THEIR OWN auth account (auth.admin.deleteUser),
 * which the anon client + RLS cannot do. Every caller must independently verify
 * ownership (getUser → only act on user.id) before using this client.
 *
 * Safety: the key lives in SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_ prefix),
 * so Next.js never inlines it into a client bundle. Never import this from a
 * Client Component. No session is persisted; this client is stateless.
 *
 * Note: this intentionally departs from the original "no service-role key"
 * design (README) — added when account deletion became a product requirement.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Account deletion is unavailable: SUPABASE_SERVICE_ROLE_KEY is not set.",
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
