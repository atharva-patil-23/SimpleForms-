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
