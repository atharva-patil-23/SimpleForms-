/**
 * The vault sidebar — lists the creator's forms grouped into Published / Drafts
 * (the Obsidian-style "vault" from DESIGN.md). Server component: the New-form
 * button and Sign-out are plain form actions.
 */
import Link from "next/link";
import { createForm } from "@/lib/actions/forms";
import styles from "./app.module.css";

export interface VaultForm {
  id: string;
  title: string;
  status: "draft" | "published";
}

export function Vault({
  forms,
  activeId,
}: {
  forms: VaultForm[];
  activeId?: string;
}) {
  const published = forms.filter((f) => f.status === "published");
  const drafts = forms.filter((f) => f.status === "draft");

  return (
    <aside className={styles.side}>
      <div className={styles.vault}>
        <span className={styles.vaultDot} />
        <b>Forms</b> vault
      </div>

      <form action={createForm} style={{ display: "contents" }}>
        <button type="submit" className={styles.newBtn}>
          <span style={{ color: "var(--cobalt)", fontWeight: 700 }}>+</span> New
          form
        </button>
      </form>

      <nav className={styles.tree}>
        <FileGroup
          label="Published"
          forms={published}
          activeId={activeId}
          emptyHint="Nothing published yet"
        />
        <FileGroup
          label="Drafts"
          forms={drafts}
          activeId={activeId}
          emptyHint="No drafts"
        />
      </nav>

      <div className={styles.status}>
        <span className={styles.statusLeft}>
          <span className={styles.statusDot} />
          {forms.length} {forms.length === 1 ? "form" : "forms"}
        </span>
        <form action="/auth/signout" method="post" style={{ display: "contents" }}>
          <button type="submit" className={styles.signout}>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function FileGroup({
  label,
  forms,
  activeId,
  emptyHint,
}: {
  label: string;
  forms: VaultForm[];
  activeId?: string;
  emptyHint: string;
}) {
  return (
    <>
      <div className={styles.folder}>▾ {label}</div>
      {forms.length === 0 ? (
        <div className={styles.empty}>{emptyHint}</div>
      ) : (
        forms.map((f) => (
          <Link
            key={f.id}
            href={`/forms/${f.id}`}
            className={`${styles.file} ${f.id === activeId ? styles.fileOn : ""}`}
          >
            <span className={styles.fileIc}>◇</span>
            {f.title || "Untitled form"}
          </Link>
        ))
      )}
    </>
  );
}
