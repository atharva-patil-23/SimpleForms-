"use client";

/**
 * Creator-app chrome. Three layouts from one tree:
 *  - Desktop expanded: vault sidebar + main, with a collapse toggle.
 *  - Desktop collapsed: the vault hides behind a slim icon rail (state is
 *    remembered in localStorage so it survives navigation and reloads).
 *  - Mobile (<760px): the vault becomes a slide-in drawer from a top bar.
 * The same <Vault> renders in every layout — no duplicate navigation.
 */
import { useEffect, useState } from "react";
import styles from "./app.module.css";

const COLLAPSE_KEY = "sf-sidebar-collapsed";

export function AppShell({
  vault,
  children,
}: {
  vault: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop rail

  // Restore the persisted desktop collapse state after mount (localStorage is
  // client-only; starting expanded avoids a hydration mismatch).
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore storage failures */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // Close the drawer on Escape (mobile).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`${styles.root} ${collapsed ? styles.rootCollapsed : ""}`}>
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
        {/* Desktop collapse toggle, overlaid at the sidebar's top-right. */}
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={toggleCollapsed}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <Chevron dir="left" />
        </button>

        {/* Slim rail shown only when collapsed (desktop). */}
        <div className={styles.rail}>
          <span className={styles.railDot} />
          <button
            type="button"
            className={styles.railExpand}
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <Chevron dir="right" />
          </button>
        </div>

        {/* The wrapper is `display: contents` on desktop (the real <Vault>
            .side is the static column) and an off-canvas container on mobile. */}
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

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {dir === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}
