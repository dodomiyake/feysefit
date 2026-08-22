-- FeyseFit: administrator AAL2 RLS for sensitive operations
-- Apply AFTER patch-function-execute-lockdown.sql.
-- Do NOT apply to production from this repository.
--
-- JWT `aal` is set by GoTrue. Frontend MFA UX is unchanged; this is defense in depth.
--
-- ROLLBACK: supabase/rollback-admin-aal-rls.sql

begin;

create or replace function public.is_aal2()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create or replace function public.is_admin_aal2()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.is_admin() and public.is_aal2();
$$;

revoke all on function public.is_aal2() from public;
revoke all on function public.is_admin_aal2() from public;
grant execute on function public.is_aal2() to anon, authenticated;
grant execute on function public.is_admin_aal2() to anon, authenticated;

-- Role changes
create or replace function public.enforce_user_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role then
    if not public.is_admin_aal2() then
      raise exception 'Only AAL2 admins can change user roles';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_user_account_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.account_status is distinct from new.account_status then
    if not public.is_admin_aal2() then
      raise exception 'Only AAL2 admins can change account status';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_marketplace_listing_designer_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    if not public.is_aal2() then
      raise exception 'Only AAL2 admins can change marketplace listings';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status
     or new.admin_notes is distinct from old.admin_notes
     or new.decline_reason is distinct from old.decline_reason then
    raise exception 'Only admins can change marketplace listing status or admin notes';
  end if;

  if new.designer_id is distinct from old.designer_id then
    raise exception 'Cannot reassign marketplace listing designer';
  end if;

  return new;
end;
$$;

drop policy if exists "users_admin_manage_team" on public.users;
create policy "users_admin_manage_team" on public.users
  for update
  using (public.is_admin_aal2())
  with check (public.is_admin_aal2());

drop policy if exists "marketplace_admin_update" on public.marketplace_listings;
create policy "marketplace_admin_update" on public.marketplace_listings
for update
using (public.is_admin_aal2())
with check (public.is_admin_aal2());

drop policy if exists "designer_profiles_admin_update" on public.designer_profiles;
create policy "designer_profiles_admin_update" on public.designer_profiles
  for update
  using (public.is_admin_aal2())
  with check (public.is_admin_aal2());

drop policy if exists "unlink_admin_designer_update" on public.unlink_requests;
create policy "unlink_admin_update" on public.unlink_requests
for update
using (public.is_admin_aal2())
with check (public.is_admin_aal2());

drop policy if exists "unlink_designer_update" on public.unlink_requests;
create policy "unlink_designer_update" on public.unlink_requests
for update
using (designer_id = public.current_designer_profile_id())
with check (designer_id = public.current_designer_profile_id());

-- Reports: keep admin read; require AAL2 for status/account mutations via users trigger.
drop policy if exists "reports_admin_all" on public.reports;
create policy "reports_admin_select" on public.reports
for select
using (public.is_admin());

create policy "reports_admin_aal2_write" on public.reports
for update
using (public.is_admin_aal2())
with check (public.is_admin_aal2());

commit;
