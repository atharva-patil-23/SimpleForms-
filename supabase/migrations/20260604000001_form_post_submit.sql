-- Post-submit settings for forms: an optional custom success message shown on
-- the completion screen, and an optional redirect URL the respondent is sent to
-- after submitting (validated as http(s) in the app). Both are owner-editable
-- and covered by the existing owner-update RLS policy (column-agnostic). NULL
-- means "use the default behavior".
alter table public.forms
  add column if not exists success_message text,
  add column if not exists redirect_url   text;
