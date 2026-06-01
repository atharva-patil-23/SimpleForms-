/**
 * OAuth callback (decision 15). Exchanges the `code` returned by the provider
 * for a Supabase session (which sets the auth cookies), then redirects to the
 * originally-requested page. A failed/expired callback lands on /login with an
 * error flag.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Validate `next` to prevent an open redirect (e.g. next="@evil.com").
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
