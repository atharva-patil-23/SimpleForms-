"use client";

/**
 * Profile menu pinned to the bottom of the vault sidebar. Shows the signed-in
 * user's avatar + name; clicking opens a popover with account actions (New
 * form, All forms, Settings, Sign out). The avatar prefers the Google profile
 * photo and falls back to initials on a cobalt chip if there's no photo (or it
 * fails to load). Closes on outside-click or Escape.
 *
 * Sign-out and New-form are real form submissions (server action / POST route),
 * so they work even mid-hydration.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createForm } from "@/lib/actions/forms";
import styles from "./app.module.css";

export interface ProfileUser {
  name: string;
  email: string;
  avatarUrl: string | null;
}

function initialsFrom(name: string, email: string): string {
  const source = name.trim() || email.trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function Avatar({
  user,
  size,
}: {
  user: ProfileUser;
  size: number;
}) {
  const [broken, setBroken] = useState(false);
  const showImg = user.avatarUrl && !broken;
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl as string}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        initialsFrom(user.name, user.email)
      )}
    </span>
  );
}

export function ProfileMenu({ user }: { user: ProfileUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const displayName = user.name.trim() || user.email.split("@")[0] || "Your account";

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.profile} ref={ref}>
      {open ? (
        <div className={styles.profileMenu} role="menu">
          <div className={styles.profileMenuHead}>
            <Avatar user={user} size={36} />
            <div className={styles.profileMenuId}>
              <span className={styles.profileMenuName}>{displayName}</span>
              {user.email ? (
                <span className={styles.profileMenuEmail}>{user.email}</span>
              ) : null}
            </div>
          </div>

          <div className={styles.profileMenuItems}>
            <form action={createForm} style={{ display: "contents" }}>
              <button type="submit" className={styles.menuItem} role="menuitem">
                <IconPlus />
                New form
              </button>
            </form>
            <Link
              href="/dashboard"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <IconGrid />
              All forms
            </Link>
            <Link
              href="/settings"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <IconGear />
              Settings
            </Link>

            <div className={styles.menuDivider} />

            <form
              action="/auth/signout"
              method="post"
              style={{ display: "contents" }}
            >
              <button
                type="submit"
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                role="menuitem"
              >
                <IconSignOut />
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={styles.profileBtn}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar user={user} size={30} />
        <span className={styles.profileText}>
          <span className={styles.profileName}>{displayName}</span>
          {user.email ? (
            <span className={styles.profileEmail}>{user.email}</span>
          ) : null}
        </span>
        <ChevronExpand open={open} />
      </button>
    </div>
  );
}

/* ---- inline glyphs ----------------------------------------------------- */
function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconSignOut() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
function ChevronExpand({ open }: { open: boolean }) {
  return (
    <svg
      className={styles.profileChevron}
      data-open={open}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 15l5-5 5 5" />
    </svg>
  );
}
