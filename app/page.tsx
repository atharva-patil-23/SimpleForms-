import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 540 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            marginBottom: 28,
          }}
        >
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 5,
              background: "var(--cobalt)",
              display: "inline-block",
            }}
          />
          SimpleForms
        </div>

        <h1
          style={{
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          Forms that feel like a calm, well-set page.
        </h1>

        <p
          style={{
            fontSize: 17,
            color: "var(--mut)",
            lineHeight: 1.5,
            marginBottom: 32,
          }}
        >
          One question at a time. Generous whitespace. The kind of form you&rsquo;d
          actually drop in a group chat.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
          }}
        >
          <Link href="/dashboard" className="btn-primary">
            Open your forms &rarr;
          </Link>
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
