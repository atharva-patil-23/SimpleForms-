"use client";

/**
 * Account settings — editable display name, read-only email, and a guarded
 * delete-account flow. Name saves go through the updateName server action
 * (own-metadata write); deletion goes through deleteAccount (service-role).
 * The delete button requires typing DELETE to arm, so it can't be a stray
 * click.
 */
import { useState } from "react";
import { updateName, deleteAccount } from "@/lib/actions/account";
import styles from "@/app/settings/settings.module.css";

export function SettingsForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const [name, setName] = useState(initialName);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [nameError, setNameError] = useState<string | null>(null);

  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const dirty = name.trim() !== initialName.trim();
  const canDelete = confirm.trim().toUpperCase() === "DELETE";

  async function saveName() {
    setSaveState("saving");
    setNameError(null);
    const res = await updateName(name);
    if (res.ok) {
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1800);
    } else {
      setSaveState("error");
      setNameError(res.error);
    }
  }

  async function onDelete() {
    if (!canDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await deleteAccount();
    // Success redirects server-side; we only get here on failure.
    if (res && !res.ok) {
      setDeleteError(res.error);
      setDeleting(false);
    }
  }

  return (
    <div className={styles.sections}>
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Profile</h2>
          <p className={styles.cardSub}>How you show up inside SimpleForms.</p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="name">
            Display name
          </label>
          <input
            id="name"
            className={styles.input}
            value={name}
            maxLength={80}
            placeholder="Your name"
            onChange={(e) => {
              setName(e.target.value);
              if (saveState !== "idle") setSaveState("idle");
            }}
          />
          {nameError ? <p className={styles.errorText}>{nameError}</p> : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className={`${styles.input} ${styles.inputLocked}`}
            value={email}
            disabled
            readOnly
          />
          <p className={styles.hint}>
            Managed by your Google account — sign-in identity can&rsquo;t be
            changed here.
          </p>
        </div>

        <div className={styles.actions}>
          <button
            className="btn-primary"
            onClick={saveName}
            disabled={!dirty || saveState === "saving"}
          >
            {saveState === "saving" ? "Saving…" : "Save changes"}
          </button>
          {saveState === "saved" ? (
            <span className={styles.savedNote}>Saved ✓</span>
          ) : null}
        </div>
      </section>

      <section className={`${styles.card} ${styles.danger}`}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Delete account</h2>
          <p className={styles.cardSub}>
            Permanently deletes your account, every form you&rsquo;ve made, and
            all of their responses. This cannot be undone.
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="confirm">
            Type <b>DELETE</b> to confirm
          </label>
          <input
            id="confirm"
            className={styles.input}
            value={confirm}
            placeholder="DELETE"
            autoComplete="off"
            onChange={(e) => setConfirm(e.target.value)}
          />
          {deleteError ? <p className={styles.errorText}>{deleteError}</p> : null}
        </div>

        <button
          className={styles.deleteBtn}
          onClick={onDelete}
          disabled={!canDelete || deleting}
        >
          {deleting ? "Deleting…" : "Delete my account"}
        </button>
      </section>
    </div>
  );
}
