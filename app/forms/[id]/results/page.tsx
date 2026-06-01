/**
 * Results view (ENGINEERING_PLAN T11, decision 11). Renders each response
 * against ITS OWN schema_snapshot, so edits to the live form never change how
 * past responses display. Owner-scoped by RLS. Crude/smoke-tested per decision
 * 14; load-all is fine at side-project scale (pagination → TODOS.md).
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Vault, type VaultForm } from "@/components/app/Vault";
import type { Question } from "@/lib/schema";
import shell from "@/components/app/app.module.css";
import styles from "./results.module.css";

export const dynamic = "force-dynamic";

interface ResponseRow {
  id: string;
  answers: Record<string, unknown>;
  schema_snapshot: Question[];
  submitted_at: string;
}

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

  // Owner-scoped explicitly. The responses query below is already owner-scoped
  // by RLS (owner reads responses to own forms), but the form-title load and
  // the vault list need the explicit owner filter (published-read policy).
  const [{ data: form }, { data: list }] = await Promise.all([
    supabase
      .from("forms")
      .select("id, title")
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

  const responses = (responseData ?? []) as ResponseRow[];
  const vaultForms = (list ?? []) as VaultForm[];

  return (
    <div className={shell.shell}>
      <Vault forms={vaultForms} activeId={id} />
      <main className={shell.main}>
        <div className={shell.toprow}>
          <span className={shell.crumb}>
            {form.title || "Untitled form"} · results
          </span>
          <Link href={`/forms/${id}`} className="btn-ghost">
            Edit form
          </Link>
        </div>

        <div className={shell.doc}>
          <div className={shell.page}>
            <div className={styles.head}>
              <div className={styles.title}>Responses</div>
              <div className={styles.sub}>
                {responses.length}{" "}
                {responses.length === 1 ? "response" : "responses"}
              </div>
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
              <div className={styles.cards}>
                {responses.map((r, i) => (
                  <ResponseCard
                    key={r.id}
                    response={r}
                    number={responses.length - i}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ResponseCard({
  response,
  number,
}: {
  response: ResponseRow;
  number: number;
}) {
  const questions = response.schema_snapshot ?? [];
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span>#{number}</span>
        <span>{new Date(response.submitted_at).toLocaleString()}</span>
      </div>
      {questions.map((q) => {
        const formatted = formatAnswer(q, response.answers[q.id]);
        return (
          <div className={styles.qa} key={q.id}>
            <div className={styles.qaQ}>{q.title}</div>
            <div className={`${styles.qaA} ${formatted === null ? styles.qaEmpty : ""}`}>
              {formatted ?? "— no answer —"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Render an answer value for display, by question type. null → no answer. */
function formatAnswer(q: Question, value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  switch (q.type) {
    case "yes_no":
      return value ? "Yes" : "No";
    case "multi_select":
      return Array.isArray(value) && value.length > 0
        ? value.join(", ")
        : null;
    case "number":
      return String(value);
    default:
      return String(value);
  }
}
