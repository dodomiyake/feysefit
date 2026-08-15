-- ROLLBACK for patch-admin-aal-rls.sql

begin;

drop policy if exists "users_admin_manage_team" on public.users;
create policy "users_admin_manage_team" on public.users
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "marketplace_admin_update" on public.marketplace_listings;
create policy "marketplace_admin_update" on public.marketplace_listings
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "designer_profiles_admin_update" on public.designer_profiles;
create policy "designer_profiles_admin_update" on public.designer_profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "unlink_admin_update" on public.unlink_requests;
drop policy if exists "unlink_designer_update" on public.unlink_requests;
create policy "unlink_admin_designer_update" on public.unlink_requests
for update
using (public.is_admin() or designer_id = public.current_designer_profile_id());

drop policy if exists "reports_admin_select" on public.reports;
drop policy if exists "reports_admin_aal2_write" on public.reports;
create policy "reports_admin_all" on public.reports
for all using (public.is_admin());

commit;
