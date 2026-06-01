# SimpleForms

A calm, minimal forms tool. One question at a time, generous whitespace, a
single accent color — the kind of form you'd actually drop in a group chat.

A creator signs in, writes a form as a document, and gets a shareable link.
Anyone can fill it out (no account needed); responses land back in the
creator's dashboard within seconds.

## Stack

- **Next.js (App Router) + TypeScript** on the front and the edges
- **Supabase** — Postgres, Auth (Google OAuth), and Row-Level Security
- **Zod** as the single source of truth for question and answer shapes
- No service-role key in the app: **RLS is the entire authorization story**

## How it fits together

```
Respondent (anon) ──fill──▶  /f/[slug]            reads the published form (RLS)
        │
        └─POST answers──▶ /api/forms/[slug]/responses   THE TRUST BOUNDARY
                            rate limit → published check → per-form cap →
                            Zod validate against the form's own schema →
                            insert (schema snapshotted into the response)

Creator (Google OAuth) ──▶  /dashboard  /forms/[id]  /forms/[id]/results
                            owner-scoped reads & writes, all via RLS
```

The submit endpoint is the only place anonymous input becomes a database write,
and it is guarded twice: once in the app (Zod + rate limit + cap) and again at
the database by an RLS `WITH CHECK` published-only insert policy.

Each response stores a **snapshot** of the form's questions at submit time, so
editing a form later never changes how its past responses render.

## Question types (v1)

short text · long text · email · number · yes/no · single select · multi select

## Local development

Requires Node 20+, Docker (for the local Supabase stack), and the Supabase CLI
(`npx supabase` works without a global install).

```bash
npm install

# 1. Start the local Supabase stack (Postgres + Auth + Studio).
#    Applies every migration in supabase/migrations.
npx supabase start

# 2. Point the app at the local stack. Copy the printed anon key.
cp .env.local.example .env.local
#    set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Run the app.
npm run dev            # http://localhost:3000
```

### Google sign-in (local)

Auth uses Google OAuth. To exercise sign-in locally:

1. In the **Google Cloud Console** → APIs & Services → Credentials:
   - Configure the OAuth consent screen (External; add yourself as a test user).
   - Create an **OAuth client ID** → *Web application*.
   - Add this **Authorized redirect URI** (this is Supabase's local callback,
     not the app's):

     ```
     http://127.0.0.1:54321/auth/v1/callback
     ```

2. Copy the credentials into a gitignored env file:

   ```bash
   cp .env.google.local.example .env.google.local
   # paste your client ID + secret
   ```

3. Start the stack with the launcher that loads them (instead of plain
   `supabase start`):

   ```bash
   npm run db:start
   ```

`supabase/config.toml` already enables the Google provider via env
substitution, allows `http://localhost:3000/auth/callback` as a redirect, and
sets `skip_nonce_check = true` (required for local Google sign-in). The app's
flow: `/login` → Google → Supabase `/auth/v1/callback` → app `/auth/callback`
(code exchange) → `/dashboard`.

For **production**, add `https://<your-domain>/auth/callback` to the Google
client's redirect URIs and to the Supabase project's auth redirect allow-list,
and set the same two env vars in the hosted project's auth settings.

## Tests

```bash
npm test               # all Vitest suites (unit + integration)
npm run test:rls       # the RLS assertions (needs `supabase start`)
npm run test:e2e       # Playwright: the full loop + isolation (needs the stack)
```

- **`tests/schema.test.ts`** — every question type, plus the runtime answer
  validator. No infrastructure required.
- **`tests/rls.integration.test.ts`** — the security spine: 8 assertions that
  pin down exactly what anon and owners can and cannot do. Runs against the
  local Supabase stack.
- **`tests/submit.integration.test.ts`** — the submit trust boundary
  (valid / invalid / closed / cap / rate limit), exercised against the real
  anon client so RLS is genuinely in the loop.
- **`e2e/`** (Playwright) — the full create → publish → fill → submit → results
  loop through a real browser, plus auth gating and cross-user isolation. The
  creator half runs authenticated; the respondent half runs in a fresh
  anonymous context, like a real share link.

The integration and e2e suites require `npx supabase start` to be running.

## Database & migrations

Schema and RLS policies live in `supabase/migrations` as versioned SQL — not the
dashboard. Reset the local database to a clean state with:

```bash
npx supabase db reset
```

## Deploy

- **App:** Vercel (auto-deploys on push). Set `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` in the project.
- **Database:** a hosted Supabase project; push migrations with
  `npx supabase db push`. Configure the Google provider and add
  `https://your-domain/auth/callback` to the allowed redirect URLs.

## Project layout

```
app/
  f/[slug]/                 the filling experience (the hero surface)
  api/forms/[slug]/responses route handler — the trust boundary
  dashboard/                your forms (single embedded-count query)
  forms/[id]/               builder editor
  forms/[id]/results/       responses, rendered per snapshot
  login/  auth/             Google OAuth
components/
  fill/                     one-question-at-a-time reducer experience
  app/                      vault sidebar, editor, dashboard pieces
lib/
  schema/                   Zod question types + runtime answer validator
  supabase/                 client factory (browser/server/middleware)
  submit.ts                 testable core of the trust boundary
  rate-limit.ts  slug.ts  qid.ts
supabase/migrations/        schema + RLS policies (the security spine)
```
