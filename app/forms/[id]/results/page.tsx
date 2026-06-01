/**
 * Results view (ENGINEERING_PLAN T11, decision 11). A spreadsheet-style table:
 * one row per response, one column per question. Columns come from the live
 * form schema plus any question still referenced by an older response snapshot
 * (see lib/responses-table), so editing a form never drops historical answers.
 * Owner-scoped by RLS. Load-all is fine at side-project scale (pagination →
 * TODOS.md). CSV export lives at ./export (owner-scoped route handler).
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Vault, type VaultForm } from "@/components/app/Vault";
import { AppShell } from "@/components/app/AppShell";
import type { Question } from "@/lib/schema";
import {
  buildColumns,
  formatCell,
  formatTimestamp,
  type ResponseRecord,
} from "@/lib/responses-table";
import { toProfileUser } from "@/lib/user";
import shell from "@/components/app/app.module.css";
import styles from "./results.module.css";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
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

  const [{ data: form }, { data: list }] = await Promise.all([
    supabase
      .from("forms")
      .select("id, title, schema")
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

  const { data: responseData } = await supabase
    .from("responses")
    .select("id, answers, schema_snapshot, submitted_at")
    .eq("form_id", id)
    .order("submitted_at", { ascending: false });

  const responses = (responseData ?? []) as ResponseRecord[];
  const vaultForms = (list ?? []) as VaultForm[];
  const liveSchema = ((form.schema as Question[]) ?? []);
  const columns = buildColumns(liveSchema, responses);

  return (
    <AppShell vault={<Vault forms={vaultForms} activeId={id} user={toProfileUser(user)} />}>
      <main className={shell.main}>
        <div className={shell.toprow}>
          <span className={shell.crumb}>
            {form.title || "Untitled form"} · results
          </span>
          <div className={shell.topActions}>
            {responses.length > 0 ? (
              <a
                className="btn-ghost"
                href={`/forms/${id}/results/export`}
                download
              >
                ↓ Export CSV
              </a>
            ) : null}
            <Link href={`/forms/${id}`} className="btn-ghost">
              Edit form
            </Link>
          </div>
        </div>

        <div className={shell.doc}>
          <div className={shell.wide}>
            <div className={styles.head}>
              <div className={styles.title}>Responses</div>
              {responses.length > 0 ? (
                <span className={styles.countChip}>
                  {responses.length}{" "}
                  {responses.length === 1 ? "response" : "responses"}
                </span>
              ) : null}
            </div>

            {responses.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyTitle}>No responses yet.</div>
                <p className={styles.emptySub}>
                  Share the form&rsquo;s link — responses show up here within
                  seconds.
                </p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.thNum}>#</th>
                      <th className={styles.thTime}>Submitted</th>
                      {columns.map((c) => (
                        <th key={c.id} className={styles.th}>
                          {c.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((r, i) => (
                      <tr key={r.id} className={styles.tr}>
                        <td className={styles.tdNum}>{responses.length - i}</td>
                        <td className={styles.tdTime}>
                          {formatTimestamp(r.submitted_at)}
                        </td>
                        {columns.map((c) => {
                          const value = formatCell(r, c);
                          return (
                            <td
                              key={c.id}
                              className={`${styles.td} ${value === "" ? styles.tdEmpty : ""}`}
                              title={value || undefined}
                            >
                              {value === "" ? "—" : value}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
