"use client";

/**
 * Creator-app chrome. On desktop it's the static two-column layout (vault +
 * main). On mobile (<760px) the vault collapses into a slide-in drawer toggled
 * from a top bar, so form-switching, New form, and Sign out stay reachable on a
 * phone. The same <Vault> renders in both layouts — no duplicate mobile nav.
 */
import { useEffect, useState } from "react";
import styles from "./app.module.css";

export function AppShell({
  vault,
  children,
}: {
  vault: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Close the drawer on Escape, and lock body scroll while it's open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={styles.root}>
      <header className={styles.mobileBar}>
        <button
          type="button"
          className={styles.menuBtn}
          aria-label="Open forms menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
        <span className={styles.mobileMark}>
          <span className={styles.vaultDot} />
          SimpleForms
        </span>
      </header>

      <div className={styles.shell}>
        {/* The wrapper is `display: contents` on desktop (the real <Vault>
            .side is the static column) and an off-canvas container on mobile.
            Navigating (a Link or form action) loads a new page with the drawer
            closed, so no explicit close-on-click is needed. */}
        <div className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`}>
          {vault}
        </div>
        {open ? (
          <div
            className={styles.backdrop}
            onClick={() => setOpen(false)}
            aria-hidden
          />
        ) : null}
        {children}
      </div>
    </div>
  );
}
