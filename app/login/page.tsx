"use client";

/**
 * Sign-in (ENGINEERING_PLAN T6, decision 15: Google OAuth for v1). Auth rides
 * entirely on Supabase Auth — never hand-rolled. The button kicks off the OAuth
 * redirect; Supabase returns to /auth/callback to exchange the code for a
 * session, then we land on the dashboard (or the `next` param).
 */
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-redirect";

function LoginInner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  async function signIn() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError("Couldn't start sign-in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            marginBottom: 26,
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: "var(--cobalt)",
            }}
          />
          SimpleForms
        </div>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.015em",
            marginBottom: 8,
          }}
        >
          Sign in
        </h1>
        <p style={{ color: "var(--mut)", fontSize: 15, marginBottom: 28 }}>
          To create forms and see your responses.
        </p>

        <button
          onClick={signIn}
          disabled={loading}
          className="btn-primary"
          style={{ width: "100%", justifyContent: "center", padding: "12px 20px", gap: 10 }}
        >
          {loading ? null : <GoogleG />}
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>

        {error ? (
          <p style={{ color: "#c8372d", fontSize: 14, marginTop: 14 }}>{error}</p>
        ) : null}
      </div>
    </main>
  );
}

/** Official 4-color Google "G", in a white chip so it reads on the cobalt button. */
function GoogleG() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        background: "#fff",
        borderRadius: 4,
        padding: 3,
        lineHeight: 0,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 18 18">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62Z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18Z"
        />
        <path
          fill="#FBBC05"
          d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34Z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
        />
      </svg>
    </span>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
