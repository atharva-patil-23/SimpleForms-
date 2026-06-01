"use client";

import { useState } from "react";

/** Copies the public share URL for a published form to the clipboard. */
export function CopyLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/f/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked — fall back to a prompt so the link is still grabbable.
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <button type="button" className="btn-ghost" onClick={copy}>
      {copied ? "Copied ✓" : "Copy link"}
    </button>
  );
}
