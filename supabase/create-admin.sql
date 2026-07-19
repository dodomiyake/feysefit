-- Create or promote a FeyseFit admin (no seed.sql required)
--
-- STEP 1 — Supabase Dashboard
--   Authentication → Users → Add user
--   - Email: your admin email (edit below)
--   - Password: your secure password
--   - Auto Confirm User: ON
--   - User Metadata (raw_user_meta_data):
--       {"name": "Your Name", "role": "admin"}
--
-- STEP 2 — Run this SQL (edit email + name first)

do $$
declare
  admin_email text := 'admin@yourdomain.com';
  admin_name text := 'FeyseFit Admin';
  auth_id uuid;
begin
  select id into auth_id from auth.users where email = admin_email;

  if auth_id is null then
    raise exception 'No auth user for %. Create the user in Authentication → Users first.', admin_email;
  end if;

  insert into public.users (id, email, name, role)
  values (auth_id, admin_email, admin_name, 'admin')
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        role = 'admin',
        updated_at = now();

  -- Remove stray customer profile if this account was created before admin role was set.
  delete from public.customer_profiles where user_id = auth_id;
end $$;

-- Verify:
-- select id, email, name, role from public.users where role = 'admin';
