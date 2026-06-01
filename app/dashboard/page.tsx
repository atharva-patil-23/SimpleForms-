/**
 * Dashboard (ENGINEERING_PLAN T10, decision 10). Lists the creator's forms with
 * a response count fetched in a SINGLE embedded-count query (no N+1). Auth is
 * enforced by middleware; we still read the user for owner scoping via RLS.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Vault, type VaultForm } from "@/components/app/Vault";
import { AppShell } from "@/components/app/AppShell";
import { CopyLink } from "@/components/app/CopyLink";
import { createForm } from "@/lib/actions/forms";
import { toProfileUser } from "@/lib/user";
import shell from "@/components/app/app.module.css";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

interface FormRow {
  id: string;
  title: string;
  status: "draft" | "published";
  public_slug: string | null;
  updated_at: string;
  responses: { count: number }[];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Single embedded-count query — responses(count) is aggregated by PostgREST.
  // owner_id is filtered EXPLICITLY: the forms table also has an "anyone can
  // read published" RLS policy (for the public /f path), so RLS alone would
  // leak every published form into this list. Scope to the signed-in owner.
  const { data } = await supabase
    .from("forms")
    .select("id, title, status, public_slug, updated_at, responses(count)")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  const forms = (data ?? []) as FormRow[];
  const vaultForms: VaultForm[] = forms.map((f) => ({
    id: f.id,
    title: f.title,
    status: f.status,
  }));

  const publishedCount = forms.filter((f) => f.status === "published").length;
  const totalResponses = forms.reduce(
    (sum, f) => sum + (f.responses?.[0]?.count ?? 0),
    0,
  );

  return (
    <AppShell vault={<Vault forms={vaultForms} user={toProfileUser(user)} />}>
      <main className={shell.main}>
        <div className={shell.toprow}>
          <span className={shell.crumb}>Your forms</span>
          <form action={createForm}>
            <button type="submit" className="btn-primary">
              + New form
            </button>
          </form>
        </div>

        <div className={shell.doc}>
          <div className={shell.page}>
            {forms.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className={styles.header}>
                  <div>
                    <h1 className={styles.headTitle}>Your forms</h1>
                    <div className={styles.headStats}>
                      <span>
                        {forms.length} {forms.length === 1 ? "form" : "forms"}
                      </span>
                      <span className={styles.statDot} />
                      <span>{publishedCount} published</span>
                      <span className={styles.statDot} />
                      <span>
                        {totalResponses}{" "}
                        {totalResponses === 1 ? "response" : "responses"}
                      </span>
                    </div>
                  </div>
                </div>

                <ul className={styles.list}>
                  {forms.map((f, i) => (
                    <li
                      key={f.id}
                      className={styles.row}
                      style={{ animationDelay: `${Math.min(i * 45, 360)}ms` }}
                    >
                      <div className={styles.rowMain}>
                        <Link
                          href={`/forms/${f.id}`}
                          className={styles.rowTitle}
                        >
                          {f.title || "Untitled form"}
                        </Link>
                        <div className={styles.rowMeta}>
                          <StatusPill status={f.status} />
                          <span>
                            {f.responses?.[0]?.count ?? 0}{" "}
                            {(f.responses?.[0]?.count ?? 0) === 1
                              ? "response"
                              : "responses"}
                          </span>
                        </div>
                      </div>
                      <div className={styles.rowActions}>
                        {f.status === "published" && f.public_slug ? (
                          <CopyLink slug={f.public_slug} />
                        ) : null}
                        <Link
                          href={`/forms/${f.id}/results`}
                          className="btn-ghost"
                        >
                          Results
                        </Link>
                        <Link href={`/forms/${f.id}`} className="btn-ghost">
                          Edit
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function StatusPill({ status }: { status: "draft" | "published" }) {
  return (
    <span
      className={`${styles.pill} ${
        status === "published" ? styles.pillPub : styles.pillDraft
      }`}
    >
      <span className={styles.pillDot} />
      {status}
    </span>
  );
}

function EmptyState() {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyMark}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 3h9l5 5v13H5z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h6" />
        </svg>
      </span>
      <div className={styles.emptyTitle}>No forms yet.</div>
      <p className={styles.emptySub}>
        Create your first form — write the questions like a document, then share
        one link. It takes about two minutes.
      </p>
      <form action={createForm} style={{ marginTop: 20 }}>
        <button type="submit" className="btn-primary">
          + New form
        </button>
      </form>
    </div>
  );
}
