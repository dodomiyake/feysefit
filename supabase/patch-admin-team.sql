-- Admin team access: allow admins to grant/revoke portal access for employees.
-- Run in Supabase SQL Editor after schema.sql.

create or replace function public.enforce_user_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Only admins can change user roles';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_user_role_change on public.users;
create trigger enforce_user_role_change
  before update on public.users
  for each row
  execute function public.enforce_user_role_change();

drop policy if exists "users_admin_manage_team" on public.users;
create policy "users_admin_manage_team" on public.users
  for update
  using (public.is_admin())
  with check (public.is_admin());
