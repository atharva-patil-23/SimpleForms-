/** Calm 404 for a bad / draft / closed form slug (decision: not-found is calm). */
export default function FormNotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 24px",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "-0.015em",
            marginBottom: 10,
          }}
        >
          This form isn&rsquo;t here.
        </div>
        <p style={{ fontSize: 17, color: "var(--mut)", lineHeight: 1.5 }}>
          The link may be wrong, or the form isn&rsquo;t published yet. Check with
          whoever shared it with you.
        </p>
      </div>
    </main>
  );
}
