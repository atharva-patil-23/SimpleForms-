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

function LoginInner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

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
          style={{ width: "100%", justifyContent: "center", padding: "12px 20px" }}
        >
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>

        {error ? (
          <p style={{ color: "#c8372d", fontSize: 14, marginTop: 14 }}>{error}</p>
        ) : null}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
