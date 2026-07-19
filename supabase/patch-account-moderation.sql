-- Account moderation: suspend/ban users + admin marketplace control
-- Run in Supabase SQL editor after schema.sql

do $$ begin
  create type public.account_status as enum ('active', 'suspended', 'banned');
exception when duplicate_object then null;
end $$;

alter table public.users
  add column if not exists account_status public.account_status not null default 'active';

drop policy if exists "designer_profiles_admin_update" on public.designer_profiles;
create policy "designer_profiles_admin_update" on public.designer_profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.enforce_user_account_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.account_status is distinct from new.account_status and not public.is_admin() then
    raise exception 'Only admins can change account status';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_user_account_status_change on public.users;
create trigger enforce_user_account_status_change
  before update on public.users
  for each row
  execute function public.enforce_user_account_status_change();
