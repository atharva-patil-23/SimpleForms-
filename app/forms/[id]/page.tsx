/**
 * Builder editor page (RSC). Loads one form (owner-scoped by RLS) plus the
 * vault list, then hands off to the client FormEditor. A form the user doesn't
 * own simply isn't returned → not-found.
 */
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Vault, type VaultForm } from "@/components/app/Vault";
import { AppShell } from "@/components/app/AppShell";
import { FormEditor, type EditQuestion } from "@/components/app/FormEditor";
import { toProfileUser } from "@/lib/user";
import type { Question } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function EditFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Owner-scoped explicitly (the published-read RLS policy would otherwise
  // expose other users' published forms here).
  const [{ data: form }, { data: list }] = await Promise.all([
    supabase
      .from("forms")
      .select("id, title, description, schema, status, public_slug")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("forms")
      .select("id, title, status")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (!form) notFound();

  const questions = ((form.schema as Question[]) ?? []).map(
    (q): EditQuestion => ({
      id: q.id,
      type: q.type,
      title: q.title,
      description: q.description,
      required: q.required ?? false,
      options:
        q.type === "single_select" || q.type === "multi_select"
          ? q.options
          : undefined,
    }),
  );

  const vaultForms = (list ?? []) as VaultForm[];

  return (
    <AppShell vault={<Vault forms={vaultForms} activeId={id} user={toProfileUser(user)} />}>
      <FormEditor
        formId={form.id}
        initialTitle={form.title}
        initialDescription={form.description ?? ""}
        initialQuestions={questions}
        status={form.status}
        slug={form.public_slug}
      />
    </AppShell>
  );
}
