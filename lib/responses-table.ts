/**
 * Shared tabular model for a form's responses — used by both the on-screen
 * submissions table and the CSV export so they always agree on columns and
 * cell values.
 *
 * Columns: the live form schema defines the column order. Because every
 * response also stores its OWN schema snapshot (a form can be edited after
 * responses arrive), we then append any question that appears in a snapshot but
 * is no longer in the live form — so no historical answer is silently dropped.
 *
 * Cells: each value is formatted against the question type from that response's
 * snapshot when available (most faithful), falling back to the column's type.
 */
import type { Question } from "@/lib/schema";

export interface ResponseRecord {
  id: string;
  answers: Record<string, unknown>;
  schema_snapshot: Question[];
  submitted_at: string;
}

export interface Column {
  id: string;
  title: string;
  question: Question;
}

/** Ordered columns: live schema first, then snapshot-only leftovers. */
export function buildColumns(
  liveSchema: Question[],
  responses: ResponseRecord[],
): Column[] {
  const columns: Column[] = [];
  const seen = new Set<string>();

  for (const q of liveSchema ?? []) {
    if (q && q.id && !seen.has(q.id)) {
      seen.add(q.id);
      columns.push({ id: q.id, title: q.title || "Untitled question", question: q });
    }
  }
  for (const r of responses) {
    for (const q of r.schema_snapshot ?? []) {
      if (q && q.id && !seen.has(q.id)) {
        seen.add(q.id);
        columns.push({ id: q.id, title: q.title || "Untitled question", question: q });
      }
    }
  }
  return columns;
}

/** Format one answer for display. Empty/missing → "" (callers decide the dash). */
export function formatCell(
  response: ResponseRecord,
  column: Column,
): string {
  const value = response.answers?.[column.id];
  if (value === undefined || value === null || value === "") return "";

  const q =
    (response.schema_snapshot ?? []).find((s) => s.id === column.id) ??
    column.question;

  switch (q.type) {
    case "yes_no":
      return value ? "Yes" : "No";
    case "multi_select":
      return Array.isArray(value) && value.length > 0 ? value.join(", ") : "";
    case "number":
      return String(value);
    default:
      return String(value);
  }
}

/** "Jun 1, 2026 · 11:30 AM" — calm, no seconds. */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

/** RFC-4180-ish CSV cell escaping: quote when the value contains a comma,
 *  quote, or newline, doubling any inner quotes. */
function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build the full CSV text: header (#, Submitted, …questions) then one row per
 *  response, oldest-first so row numbers read naturally. ISO timestamps in the
 *  export (unambiguous for spreadsheets), unlike the on-screen friendly form. */
export function toCsv(columns: Column[], responses: ResponseRecord[]): string {
  const header = ["#", "Submitted", ...columns.map((c) => c.title)];
  const ordered = [...responses].sort(
    (a, b) =>
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
  );
  const rows = ordered.map((r, i) => {
    const cells = [
      String(i + 1),
      new Date(r.submitted_at).toISOString(),
      ...columns.map((c) => formatCell(r, c)),
    ];
    return cells.map(csvCell).join(",");
  });
  return [header.map(csvCell).join(","), ...rows].join("\r\n");
}
