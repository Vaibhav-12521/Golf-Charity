-- =====================================================================
-- MIGRATION 003 — Signup trigger reads charity from user metadata
--
-- Background: the original handle_new_user() trigger only wrote
-- (id, email, full_name) into profiles. The client then PATCHed
-- /api/profile to set charity_id + charity_percent. That PATCH 401s when
-- email confirmation is ON (no session immediately after signUp), which
-- silently dropped the user's charity selection — breaking the donation
-- split that the Stripe webhook relies on later.
--
-- After this migration the trigger reads charity_id + charity_percent
-- directly from auth.users.raw_user_meta_data (passed via supabase.auth
-- .signUp options.data on the client), so profiles are complete
-- regardless of the email-confirmation flow.
--
-- Idempotent — safe to re-run.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_charity_id uuid;
  v_charity_percent numeric;
begin
  -- charity_id — ignore if malformed / missing
  begin
    v_charity_id := nullif(meta->>'charity_id', '')::uuid;
  exception when others then
    v_charity_id := null;
  end;

  -- charity_percent — clamp to [10, 100]; default 10
  begin
    v_charity_percent := nullif(meta->>'charity_percent', '')::numeric;
  exception when others then
    v_charity_percent := null;
  end;
  v_charity_percent := greatest(10, least(100, coalesce(v_charity_percent, 10)));

  insert into public.profiles (id, email, full_name, charity_id, charity_percent)
  values (
    new.id,
    new.email,
    coalesce(meta->>'full_name', split_part(new.email, '@', 1)),
    v_charity_id,
    v_charity_percent
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger itself stays the same; just rebind it idempotently.
drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
