/**
 * Map a Supabase auth user to the minimal profile shape the sidebar needs.
 * Google OAuth stows the display name and photo in user_metadata under a
 * couple of possible keys (full_name/name, avatar_url/picture) — normalize them
 * here so the UI doesn't have to.
 */
import type { User } from "@supabase/supabase-js";
import type { ProfileUser } from "@/components/app/ProfileMenu";

export function toProfileUser(user: User): ProfileUser {
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    name: (m.full_name as string) || (m.name as string) || "",
    email: user.email ?? "",
    avatarUrl: (m.avatar_url as string) || (m.picture as string) || null,
  };
}
