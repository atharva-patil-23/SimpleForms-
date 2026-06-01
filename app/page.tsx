import Link from "next/link";
import { Reveal } from "@/components/landing/Reveal";
import styles from "@/components/landing/landing.module.css";

/* Small inline glyphs so the page carries no icon-library dependency. They
   inherit currentColor, so the cobalt feature tiles tint them automatically. */
function IconDoc() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 3h9l5 5v13H5z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  );
}
function IconBolt() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}

const QUESTION_TYPES = [
  "short text",
  "long text",
  "email",
  "number",
  "yes / no",
  "single select",
  "multi select",
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      {/* --- nav ----------------------------------------------------------- */}
      <header className={styles.nav}>
        <nav className={styles.navInner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark} />
            SimpleForms
          </Link>
          <div className={styles.navLinks}>
            <Link href="/login" className={styles.navSignIn}>
              Sign in
            </Link>
            <Link href="/dashboard" className={`btn-primary ${styles.navCta}`}>
              Open your forms
            </Link>
          </div>
        </nav>
      </header>

      {/* --- hero ---------------------------------------------------------- */}
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <Reveal>
            <span className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              One question at a time
            </span>
          </Reveal>

          <Reveal delay={70}>
            <h1 className={styles.h1}>Forms that feel like a calm, well-set page.</h1>
          </Reveal>

          <Reveal delay={140}>
            <p className={styles.heroSub}>
              Write a form like a document, share one link, and watch responses
              land in seconds. No respondent account, no clutter &mdash; the kind
              of form you&rsquo;d actually drop in a group chat.
            </p>
          </Reveal>

          <Reveal delay={210}>
            <div className={styles.ctaRow}>
              <Link href="/dashboard" className={`btn-primary ${styles.heroCtaPrimary}`}>
                Open your forms &rarr;
              </Link>
              <Link href="/login" className={`btn-ghost ${styles.heroCtaGhost}`}>
                Sign in
              </Link>
            </div>
          </Reveal>

          <Reveal delay={280}>
            <div className={styles.trust}>
              <span className={styles.trustItem}>
                <span className={styles.trustDot} />
                No account needed to fill
              </span>
              <span className={styles.trustItem}>
                <span className={styles.trustDot} />
                Responses in seconds
              </span>
              <span className={styles.trustItem}>
                <span className={styles.trustDot} />
                Secured by row-level security
              </span>
            </div>
          </Reveal>
        </div>

        {/* product, shown as itself: the one-question-at-a-time fill view */}
        <Reveal delay={160} className={styles.preview}>
          <span className={styles.previewGhost} aria-hidden="true" />
          <div className={styles.previewCard}>
            <div className={styles.previewProgress}>
              <span className={styles.previewProgressFill} />
            </div>
            <div className={styles.previewQRow}>
              <span className={styles.previewQNum}>2.</span>
              <span className={styles.previewQ}>
                Which day works best for the team dinner?
              </span>
            </div>
            <span className={styles.previewTag}>single&#8209;select</span>
            <div className={styles.previewChips}>
              <span className={`${styles.previewChip} ${styles.previewChipActive}`}>
                Friday
                <span className={styles.previewChipKey}>1</span>
              </span>
              <span className={styles.previewChip}>
                Saturday
                <span className={styles.previewChipKey}>2</span>
              </span>
              <span className={styles.previewChip}>
                Sunday
                <span className={styles.previewChipKey}>3</span>
              </span>
            </div>
            <div className={styles.previewFooter}>
              <span className={styles.previewHint}>Press Enter &crarr;</span>
              <span className={`btn-primary ${styles.previewContinue}`}>
                Continue &rarr;
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* --- question types strip ----------------------------------------- */}
      <Reveal as="div" className={styles.typesStrip}>
        {QUESTION_TYPES.map((t) => (
          <span key={t} className={styles.typePill}>
            {t}
          </span>
        ))}
      </Reveal>

      {/* --- features ------------------------------------------------------ */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <Reveal>
            <span className={styles.kicker}>Why it feels different</span>
          </Reveal>
          <Reveal delay={70}>
            <h2 className={styles.sectionTitle}>
              A tool for thought, not a form factory.
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className={styles.sectionSub}>
              Authoring feels like editing a document. Filling feels like a quiet
              conversation. Both halves share one calm, cobalt-accented system.
            </p>
          </Reveal>
        </div>

        <div className={styles.features}>
          <Reveal className={styles.featureWide}>
            <article className={`${styles.featureCard} ${styles.featureWide}`}>
              <span className={styles.featureIcon}>
                <IconDoc />
              </span>
              <h3 className={styles.featureTitle}>Write it like a document</h3>
              <p className={styles.featureText}>
                A markdown-style heading, numbered questions, and a{" "}
                <code>/</code> command to add the next one. If you&rsquo;ve used a
                notes app, you already know how to build a form here.
              </p>
              <div className={styles.featureCode}>
                <span className={styles.featureCodeAccent}>#</span> Team dinner
                <br />
                <span className={styles.featureCodeAccent}>1.</span> What&rsquo;s
                your name?
                <br />
                <span className={styles.featureCodeAccent}>/</span> add a
                question&hellip;
              </div>
            </article>
          </Reveal>

          <Reveal delay={90}>
            <article className={styles.featureCard}>
              <span className={styles.featureIcon}>
                <IconBolt />
              </span>
              <h3 className={styles.featureTitle}>Answers, snapshotted</h3>
              <p className={styles.featureText}>
                Every response stores the form as it was at submit time. Edit the
                form later and your past results never shift under you.
              </p>
            </article>
          </Reveal>

          <Reveal delay={90}>
            <article className={styles.featureCard}>
              <span className={styles.featureIcon}>
                <IconLayers />
              </span>
              <h3 className={styles.featureTitle}>One question at a time</h3>
              <p className={styles.featureText}>
                Respondents see a single question on a clean canvas &mdash; no app
                chrome, no scrollbar of dread. Just the next thing to answer.
              </p>
            </article>
          </Reveal>
        </div>
      </section>

      {/* --- how it works -------------------------------------------------- */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <Reveal>
            <span className={styles.kicker}>How it works</span>
          </Reveal>
          <Reveal delay={70}>
            <h2 className={styles.sectionTitle}>From blank page to answers in three steps.</h2>
          </Reveal>
        </div>

        <div className={styles.steps}>
          <Reveal>
            <div className={styles.step}>
              <span className={styles.stepNum}>1</span>
              <h3 className={styles.stepTitle}>Write your form</h3>
              <p className={styles.stepText}>
                Sign in with Google and draft questions like you&rsquo;d write a
                note. Pick from seven question types as you go.
              </p>
            </div>
          </Reveal>
          <Reveal delay={90}>
            <div className={styles.step}>
              <span className={styles.stepNum}>2</span>
              <h3 className={styles.stepTitle}>Share one link</h3>
              <p className={styles.stepText}>
                Publish to get a clean link. Anyone can fill it out &mdash; no
                account, no friction, on any device.
              </p>
            </div>
          </Reveal>
          <Reveal delay={180}>
            <div className={styles.step}>
              <span className={styles.stepNum}>3</span>
              <h3 className={styles.stepTitle}>Watch responses land</h3>
              <p className={styles.stepText}>
                Answers arrive in your dashboard within seconds, each rendered
                exactly as the respondent saw it.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* --- final CTA ----------------------------------------------------- */}
      <div className={styles.ctaWrap}>
        <Reveal>
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaTitle}>Make your first form.</h2>
            <p className={styles.ctaSub}>
              It takes about a minute to write, and exactly one link to share.
              Your responses are waiting on the other side.
            </p>
            <Link href="/dashboard" className={styles.ctaBtn}>
              Open your forms &rarr;
            </Link>
          </div>
        </Reveal>
      </div>

      {/* --- footer -------------------------------------------------------- */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerBrand}>
            <span className={styles.brandMark} />
            SimpleForms
          </span>
          <span className={styles.footerMeta}>
            Calm forms, one question at a time.
          </span>
          <div className={styles.footerLinks}>
            <Link href="/login" className={styles.footerLink}>
              Sign in
            </Link>
            <Link href="/dashboard" className={styles.footerLink}>
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
