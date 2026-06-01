-- SimpleForms — full schema bootstrap for a fresh hosted Supabase project.
--
-- This is the three versioned migrations in supabase/migrations/ concatenated
-- into one file for convenient first-time cloud setup: paste it into the
-- Supabase dashboard SQL Editor and Run. The migrations remain the source of
-- truth; regenerate this with:
--   cat supabase/migrations/*.sql > supabase/schema.sql
--
-- (Alternatively, skip this file and run `supabase db push` after linking.)

-- SimpleForms initial schema (ENGINEERING_PLAN data model, decisions 5 & 11).
-- Three tables: profiles, forms, responses. RLS policies live in the next
-- migration so the "security spine" is reviewable on its own.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, id == auth.uid().
-- ---------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

-- Auto-provision a profile row whenever a new auth user is created. This keeps
-- profiles in lockstep with Supabase Auth without any app-layer plumbing.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- forms: a form is a row; its questions are an ordered jsonb array (decision 4).
-- ---------------------------------------------------------------------------
create table public.forms (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  title       text not null default 'Untitled form',
  description text,
  schema      jsonb not null default '[]'::jsonb,            -- ordered questions
  status      text  not null default 'draft'
                check (status in ('draft', 'published')),
  public_slug text unique,                                   -- nanoid, set at publish
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index forms_owner_id_idx on public.forms (owner_id);
-- public_slug already has a UNIQUE index from the column constraint above
-- (decision 4: unguessable nanoid, looked up on the anon read path).

-- ---------------------------------------------------------------------------
-- responses: one submitted answer set. schema_snapshot makes each response
-- self-describing forever, even after the form's schema is later edited
-- (decision 11).
-- ---------------------------------------------------------------------------
create table public.responses (
  id              uuid primary key default gen_random_uuid(),
  form_id         uuid not null references public.forms (id) on delete cascade,
  answers         jsonb not null,
  schema_snapshot jsonb not null,
  meta            jsonb not null default '{}'::jsonb,        -- user agent, etc.
  submitted_at    timestamptz not null default now()
);

create index responses_form_id_idx on public.responses (form_id);

-- Keep updated_at honest on forms.
create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger forms_touch_updated_at
  before update on public.forms
  for each row execute function public.touch_updated_at();
-- SimpleForms RLS policies — the security spine (ENGINEERING_PLAN decisions
-- 1, 2, 7, 12). This is the file the 8 RLS integration assertions pin down.
--
-- Trust model:
--   * anon (no session)  can read a PUBLISHED form by its unguessable slug, and
--                        insert a response into a published form — nothing else.
--   * authed owner       can read/write only their own forms and read their own
--                        responses.
--   * nobody             can read another user's responses (default deny).

alter table public.profiles  enable row level security;
alter table public.forms     enable row level security;
alter table public.responses enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: own row only.
-- ---------------------------------------------------------------------------
create policy "profiles: owner can read own row"
  on public.profiles for select
  using (id = (select auth.uid()));

create policy "profiles: owner can update own row"
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- forms
-- ---------------------------------------------------------------------------

-- Owner reads their own forms (dashboard, results, builder).
create policy "forms: owner can read own forms"
  on public.forms for select
  to authenticated
  using (owner_id = (select auth.uid()));

-- Anyone (incl. anon) can read a PUBLISHED form. The slug is unguessable, so
-- this is "read a published form by its slug" in practice.
create policy "forms: anyone can read published forms"
  on public.forms for select
  to anon, authenticated
  using (status = 'published');

-- Owner creates / edits / deletes only their own forms.
create policy "forms: owner can insert own forms"
  on public.forms for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "forms: owner can update own forms"
  on public.forms for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "forms: owner can delete own forms"
  on public.forms for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- responses
-- ---------------------------------------------------------------------------

-- Anon (and authed) can insert a response ONLY into a published form. The
-- WITH CHECK subquery hits forms by primary key, so it is cheap (footgun noted
-- in the plan; this is the policy the assertions guard). The per-form response
-- CAP is enforced in the route handler before insert (decision 12) — RLS only
-- enforces the published-only invariant.
create policy "responses: anyone can insert into a published form"
  on public.responses for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.forms f
      where f.id = form_id and f.status = 'published'
    )
  );

-- Owner reads responses to their own forms only.
create policy "responses: owner can read responses to own forms"
  on public.responses for select
  to authenticated
  using (
    exists (
      select 1 from public.forms f
      where f.id = responses.form_id and f.owner_id = (select auth.uid())
    )
  );

-- No anon select policy on responses → default deny. Respondents never read
-- responses (theirs or anyone's).
-- Helper RPCs for the public submit path.
--
-- Anon respondents have NO select policy on `responses` (default deny), so the
-- route handler cannot count responses directly to enforce the per-form cap
-- (decision 12). This SECURITY DEFINER function returns ONLY an integer count
-- for a PUBLISHED form — never any response data — so the handler can enforce
-- the cap without weakening the responses read policy.

create function public.published_form_response_count(p_slug text)
returns integer
language sql
security definer
set search_path = ''
stable
as $$
  select count(*)::int
  from public.responses r
  join public.forms f on f.id = r.form_id
  where f.public_slug = p_slug
    and f.status = 'published';
$$;

-- Callable by anyone hitting the public endpoint.
grant execute on function public.published_form_response_count(text) to anon, authenticated;
