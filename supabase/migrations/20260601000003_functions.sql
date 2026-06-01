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
