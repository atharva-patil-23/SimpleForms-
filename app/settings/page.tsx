/**
 * Account settings. Owner-scoped: reads the signed-in user for name/email and
 * the form list for the vault. Name lives in auth user_metadata (set from the
 * Google profile on first sign-in, editable here); email is the auth identity.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Vault, type VaultForm } from "@/components/app/Vault";
import { AppShell } from "@/components/app/AppShell";
import { SettingsForm } from "@/components/app/SettingsForm";
import { toProfileUser } from "@/lib/user";
import shell from "@/components/app/app.module.css";
import styles from "./settings.module.css";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: list } = await supabase
    .from("forms")
    .select("id, title, status")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  const vaultForms = (list ?? []) as VaultForm[];

  const meta = user.user_metadata ?? {};
  const initialName =
    (meta.full_name as string) || (meta.name as string) || "";
  const email = user.email ?? "";

  return (
    <AppShell vault={<Vault forms={vaultForms} user={toProfileUser(user)} />}>
      <main className={shell.main}>
        <div className={shell.toprow}>
          <span className={shell.crumb}>Settings</span>
        </div>

        <div className={shell.doc}>
          <div className={shell.page}>
            <div className={styles.head}>
              <div className={styles.title}>Settings</div>
              <div className={styles.sub}>Manage your account.</div>
            </div>
            <SettingsForm initialName={initialName} email={email} />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
