/**
 * Open-redirect guard for post-auth navigation. A `next` value is only safe if
 * it's a same-site absolute PATH — it must start with a single "/" and not be a
 * scheme-relative ("//host") or backslash ("/\\host") URL, both of which browsers
 * resolve to a different host. Anything else (incl. "@evil.com", "https://…")
 * falls back to the dashboard. Without this, `${origin}${next}` with
 * next="@evil.com" resolves to https://app.com@evil.com → host evil.com.
 */
export function safeNext(next: string | null | undefined): string {
  if (
    typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/\\")
  ) {
    return next;
  }
  return "/dashboard";
}
