/**
 * THE TRUST BOUNDARY (ENGINEERING_PLAN decisions 1, 7, 12).
 *
 * The only place untrusted (anonymous) input becomes a database write. This is
 * a thin adapter over lib/submit.ts#handleSubmit (which holds the testable
 * core). Guarded twice: app-layer (rate limit + cap + published check + Zod)
 * and DB-layer RLS `WITH CHECK`.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleSubmit } from "@/lib/submit";

export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const supabase = await createClient();
  const result = await handleSubmit(supabase, {
    slug,
    rateLimitKey: `${clientIp(req)}:${slug}`,
    userAgent: req.headers.get("user-agent"),
    answers: (body as { answers?: unknown } | null)?.answers,
  });

  const headers: Record<string, string> = {};
  if (result.retryAfter !== undefined) {
    headers["Retry-After"] = String(result.retryAfter);
  }
  return NextResponse.json(result.body, { status: result.status, headers });
}
