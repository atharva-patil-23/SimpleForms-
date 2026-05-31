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
