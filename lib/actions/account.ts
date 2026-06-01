"use server";

/**
 * Account-level server actions: rename and delete-account.
 *
 * - updateName writes to the user's own auth metadata via the anon/authed
 *   client (a user may update their own metadata; no elevated privilege).
 * - deleteAccount is the only elevated operation in the app. It verifies the
 *   caller is signed in, then deletes THAT user's auth row with the service
 *   role client. The DB cascades profile → forms → responses (schema.sql), so
 *   no app-layer cleanup is needed. We sign out and head home afterward.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateName(
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = name.trim();
  if (trimmed.length > 80) {
    return { ok: false, error: "Name is too long (80 characters max)." };
  }

  const { error } = await supabase.auth.updateUser({
    data: { full_name: trimmed, name: trimmed },
  });
  if (error) return { ok: false, error: "Couldn't save your name. Try again." };
  return { ok: true };
}

export async function deleteAccount(): Promise<{ ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Elevated: delete the auth user. Scoped strictly to the caller's own id —
  // the only id we ever pass here is the one we just authenticated.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return { ok: false, error: "Couldn't delete your account. Try again." };
  }

  // Best-effort: clear the local session cookies before leaving.
  await supabase.auth.signOut();
  redirect("/");
}
