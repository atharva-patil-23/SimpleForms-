/**
 * CSV export for a form's responses. Owner-scoped: the authed server client +
 * RLS only return forms/responses the signed-in user owns, and we additionally
 * filter forms by owner_id. Columns + cell formatting are shared with the
 * on-screen table (lib/responses-table) so the file matches what's displayed.
 *
 * Returns a UTF-8 CSV as a download (Content-Disposition: attachment). A BOM is
 * prepended so Excel opens non-ASCII answers correctly.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Question } from "@/lib/schema";
import {
  buildColumns,
  toCsv,
  type ResponseRecord,
} from "@/lib/responses-table";

export const dynamic = "force-dynamic";

/** Make a tidy, filesystem-safe filename stem from the form title. */
function slugifyTitle(title: string): string {
  const base = (title || "form")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return base || "form";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?next=/forms/${id}/results`, _request.url),
    );
  }

  const { data: form } = await supabase
    .from("forms")
    .select("id, title, schema")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!form) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: responseData } = await supabase
    .from("responses")
    .select("id, answers, schema_snapshot, submitted_at")
    .eq("form_id", id)
    .order("submitted_at", { ascending: false });

  const responses = (responseData ?? []) as ResponseRecord[];
  const columns = buildColumns((form.schema as Question[]) ?? [], responses);
  const csv = toCsv(columns, responses);

  const date = new Date().toISOString().slice(0, 10);
  const filename = `${slugifyTitle(form.title as string)}-responses-${date}.csv`;

  // ﻿ BOM → Excel detects UTF-8 and renders accented/non-Latin answers.
  return new NextResponse("﻿" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
