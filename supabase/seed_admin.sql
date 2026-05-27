-- =====================================================================
-- Seed default admin user.
-- Run AFTER schema.sql.
--
--   Email:    admin@digihero.com
--   Password: admin@123
-- Idempotent — safe to re-run; it skips creation if the user already exists.
-- =====================================================================

do $$
declare
  admin_id uuid;
begin
  -- 1) Create the auth user if missing.
  select id into admin_id from auth.users where email = 'admin@digihero.com' limit 1;

  if admin_id is null then
    admin_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      'admin@digihero.com',
      crypt('admin@123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Platform Admin"}',
      now(),
      now(),
      '', '', '', ''
    );

    -- Mirror identity record so login flows resolve cleanly.
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      admin_id,
      admin_id::text,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@digihero.com', 'email_verified', true),
      'email',
      now(), now(), now()
    );
  end if;

  -- 2) Ensure the profile row exists + is promoted to admin.
  insert into public.profiles (id, email, full_name, role, charity_percent)
  values (admin_id, 'admin@digihero.com', 'Platform Admin', 'admin', 10)
  on conflict (id) do update
    set role = 'admin',
        email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        updated_at = now();
end $$;
