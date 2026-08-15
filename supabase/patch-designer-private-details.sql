-- FeyseFit: public/private designer data separation
-- Apply AFTER patch-marketplace-admin-approval.sql (and patch-designer-contact-service-areas.sql).
-- Do NOT apply to production from this repository. Run in a staging SQL editor first.
--
-- Run this entire file from line 1. Do not run supabase/tests/security-hardening.sql first.
-- Idempotent re-run: does not overwrite non-empty designer_private_details.phone
-- with blank leftover designer_profiles.phone values.
--
-- Closes: anonymous/authenticated REST SELECT of phone and user_id on live designer_profiles.
-- RLS is row-level only; this patch uses a private table + column grants + a public view.
--
-- ROLLBACK: supabase/rollback-designer-private-details.sql

begin;

-- ---------------------------------------------------------------------------
-- 1) Private contact table (one row per designer)
--     Table creation and backfill are in one PL/pgSQL block so a SQL-editor
--     that splits on semicolons cannot run the count before CREATE TABLE.
-- ---------------------------------------------------------------------------
do $$
declare
  profile_count integer;
  private_before integer;
  private_after integer;
begin
  if to_regclass('public.designer_private_details') is null then
    execute $ddl$
      create table public.designer_private_details (
        designer_id uuid primary key references public.designer_profiles (id) on delete cascade,
        phone text not null default '',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    $ddl$;
    raise notice 'created public.designer_private_details';
  else
    raise notice 'public.designer_private_details already exists';
  end if;

  execute $ddl$
    comment on table public.designer_private_details is
      'Owner-and-admin contact details. Never grant to anon. Never join from public marketplace views.'
  $ddl$;

  execute 'alter table public.designer_private_details enable row level security';
  execute 'alter table public.designer_private_details force row level security';

  execute 'revoke all on table public.designer_private_details from public, anon, authenticated';
  execute 'grant select, insert, update on table public.designer_private_details to authenticated';

  -- ---------------------------------------------------------------------------
  -- 2) Backfill phone without printing values
  -- ---------------------------------------------------------------------------
  select count(*) into profile_count from public.designer_profiles;
  select count(*) into private_before from public.designer_private_details;

  insert into public.designer_private_details (designer_id, phone)
  select dp.id, coalesce(dp.phone, '')
  from public.designer_profiles dp
  on conflict (designer_id) do update
    set phone = excluded.phone,
        updated_at = now()
    where coalesce(excluded.phone, '') <> ''
      and coalesce(public.designer_private_details.phone, '') = '';

  select count(*) into private_after from public.designer_private_details;

  if private_after < profile_count then
    raise exception 'designer_private_details backfill incomplete: % rows vs % profiles',
      private_after, profile_count;
  end if;

  raise notice 'designer_private_details backfill: profiles=%, private_before=%, private_after=%',
    profile_count, private_before, private_after;
end $$;

drop policy if exists "designer_private_owner_select" on public.designer_private_details;
drop policy if exists "designer_private_owner_write" on public.designer_private_details;
drop policy if exists "designer_private_owner_insert" on public.designer_private_details;
drop policy if exists "designer_private_owner_update" on public.designer_private_details;
drop policy if exists "designer_private_admin_aal2_select" on public.designer_private_details;
drop policy if exists "designer_private_admin_aal2_write" on public.designer_private_details;

create policy "designer_private_owner_select"
on public.designer_private_details
for select
to authenticated
using (designer_id = public.current_designer_profile_id());

create policy "designer_private_owner_insert"
on public.designer_private_details
for insert
to authenticated
with check (designer_id = public.current_designer_profile_id());

create policy "designer_private_owner_update"
on public.designer_private_details
for update
to authenticated
using (designer_id = public.current_designer_profile_id())
with check (designer_id = public.current_designer_profile_id());

create policy "designer_private_admin_aal2_select"
on public.designer_private_details
for select
to authenticated
using (public.is_admin() and coalesce(auth.jwt() ->> 'aal', '') = 'aal2');

create policy "designer_private_admin_aal2_write"
on public.designer_private_details
for update
to authenticated
using (public.is_admin() and coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
with check (public.is_admin() and coalesce(auth.jwt() ->> 'aal', '') = 'aal2');

-- Keep a private row for every new designer profile.
create or replace function public.ensure_designer_private_details()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.designer_private_details (designer_id, phone)
  values (new.id, coalesce(new.phone, ''))
  on conflict (designer_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_ensure_designer_private_details on public.designer_profiles;
create trigger trg_ensure_designer_private_details
  after insert on public.designer_profiles
  for each row
  execute function public.ensure_designer_private_details();

-- Clear leftover contact values on the public-facing table. Counts only — no PII.
do $$
declare
  cleared integer;
begin
  update public.designer_profiles
  set phone = '',
      updated_at = now()
  where coalesce(phone, '') <> '';
  get diagnostics cleared = row_count;
  raise notice 'cleared designer_profiles.phone on % rows', cleared;
end $$;

-- ---------------------------------------------------------------------------
-- 3) Column privileges: never grant SELECT * (or private columns) to anon
--     Table-level SELECT must be revoked BEFORE column GRANTs.
--     Do not REVOKE SELECT after column GRANTs — that also drops column privileges.
-- ---------------------------------------------------------------------------
revoke all on table public.designer_profiles from public, anon, authenticated;
revoke select on table public.designer_profiles from public, anon, authenticated;

grant select (
  id,
  legacy_id,
  business_name,
  designer_name,
  location,
  specialty,
  bio,
  tagline,
  rating,
  review_count,
  cover_image,
  profile_image,
  marketplace_live,
  city,
  country,
  offers_in_person,
  price_range_min,
  price_range_max,
  years_experience,
  appointment_slot_minutes,
  offered_meeting_modes,
  service_areas,
  created_at,
  updated_at
) on table public.designer_profiles to anon, authenticated;

grant update (
  business_name,
  designer_name,
  location,
  specialty,
  bio,
  tagline,
  rating,
  review_count,
  cover_image,
  profile_image,
  marketplace_live,
  city,
  country,
  offers_in_person,
  price_range_min,
  price_range_max,
  years_experience,
  appointment_slot_minutes,
  offered_meeting_modes,
  service_areas,
  updated_at
) on table public.designer_profiles to authenticated;

-- user_id, admin_notes, and phone remain ungranted to anon/authenticated.
-- Owners look up their row via own_designer_profile(). Admins use admin_* RPCs.

do $$
begin
  if has_table_privilege('anon', 'public.designer_profiles', 'SELECT')
     or has_table_privilege('authenticated', 'public.designer_profiles', 'SELECT') then
    raise exception
      'designer_profiles still has table-level SELECT for anon or authenticated';
  end if;

  if has_column_privilege('anon', 'public.designer_profiles', 'phone', 'SELECT')
     or has_column_privilege('authenticated', 'public.designer_profiles', 'phone', 'SELECT')
     or has_column_privilege('anon', 'public.designer_profiles', 'user_id', 'SELECT')
     or has_column_privilege('authenticated', 'public.designer_profiles', 'user_id', 'SELECT')
     or has_column_privilege('anon', 'public.designer_profiles', 'admin_notes', 'SELECT')
     or has_column_privilege('authenticated', 'public.designer_profiles', 'admin_notes', 'SELECT') then
    raise exception
      'private designer_profiles columns are still selectable by anon or authenticated';
  end if;

  if not has_column_privilege('anon', 'public.designer_profiles', 'id', 'SELECT')
     or not has_column_privilege('authenticated', 'public.designer_profiles', 'id', 'SELECT') then
    raise exception 'anon/authenticated lost SELECT on public designer_profiles.id';
  end if;
end $$;

create or replace function public.own_designer_profile()
returns table (id uuid, legacy_id text)
language sql
stable
security definer
set search_path = public
as $$
  select dp.id, dp.legacy_id
  from public.designer_profiles dp
  where dp.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.own_designer_profile() from public;
grant execute on function public.own_designer_profile() to authenticated;

create or replace function public.admin_get_designer_moderation(p_designer_id uuid)
returns table (user_id uuid, admin_notes text, email text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.is_admin()
     or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'not authorized';
  end if;

  return query
  select dp.user_id, dp.admin_notes, u.email
  from public.designer_profiles dp
  join public.users u on u.id = dp.user_id
  where dp.id = p_designer_id;
end;
$$;

create or replace function public.admin_set_designer_notes(p_designer_id uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.is_admin()
     or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'not authorized';
  end if;

  update public.designer_profiles
  set admin_notes = nullif(trim(p_notes), ''),
      updated_at = now()
  where id = p_designer_id;
end;
$$;

create or replace function public.admin_lookup_profiles_by_user_ids(p_user_ids uuid[])
returns table (
  user_id uuid,
  designer_id uuid,
  designer_legacy_id text,
  customer_id uuid,
  customer_legacy_id text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.is_admin()
     or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'not authorized';
  end if;

  return query
  select
    u.id,
    dp.id,
    dp.legacy_id,
    cp.id,
    cp.legacy_id
  from unnest(p_user_ids) as u(id)
  left join public.designer_profiles dp on dp.user_id = u.id
  left join public.customer_profiles cp on cp.user_id = u.id;
end;
$$;

revoke all on function public.admin_get_designer_moderation(uuid) from public;
revoke all on function public.admin_set_designer_notes(uuid, text) from public;
revoke all on function public.admin_lookup_profiles_by_user_ids(uuid[]) from public;
grant execute on function public.admin_get_designer_moderation(uuid) to authenticated;
grant execute on function public.admin_set_designer_notes(uuid, text) to authenticated;
grant execute on function public.admin_lookup_profiles_by_user_ids(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Public marketplace projection (approved + live only)
-- ---------------------------------------------------------------------------
-- security_invoker: callers only see rows their grants + RLS allow.
-- Subquery in FROM makes the view non-auto-updatable (EXISTS in WHERE is not enough).
drop view if exists public.marketplace_designers;
create view public.marketplace_designers
with (security_invoker = true) as
select
  live.id,
  live.legacy_id,
  live.business_name,
  live.designer_name,
  live.location,
  live.specialty,
  live.bio,
  live.tagline,
  live.rating,
  live.review_count,
  live.cover_image,
  live.profile_image,
  live.city,
  live.country,
  live.offers_in_person,
  live.price_range_min,
  live.price_range_max,
  live.years_experience,
  live.appointment_slot_minutes,
  live.offered_meeting_modes,
  live.service_areas,
  live.created_at
from (
  select
    d.id,
    d.legacy_id,
    d.business_name,
    d.designer_name,
    d.location,
    d.specialty,
    d.bio,
    d.tagline,
    d.rating,
    d.review_count,
    d.cover_image,
    d.profile_image,
    d.city,
    d.country,
    d.offers_in_person,
    d.price_range_min,
    d.price_range_max,
    d.years_experience,
    d.appointment_slot_minutes,
    d.offered_meeting_modes,
    d.service_areas,
    d.created_at
  from public.designer_profiles d
  where d.marketplace_live = true
    and exists (
      select 1
      from public.marketplace_listings ml
      where ml.designer_id = d.id
        and ml.status = 'approved'::public.marketplace_status
    )
) live;

comment on view public.marketplace_designers is
  'Read-only public marketplace projection. No phone, user_id, admin_notes, or other private columns. Not auto-updatable.';

revoke all on table public.marketplace_designers from public, anon, authenticated;
grant select on table public.marketplace_designers to anon, authenticated;

do $$
declare
  updatable text;
  insertable text;
begin
  select is_updatable, is_insertable_into into updatable, insertable
  from information_schema.views
  where table_schema = 'public'
    and table_name = 'marketplace_designers';
  if updatable is distinct from 'NO' or insertable is distinct from 'NO' then
    raise exception 'marketplace_designers still updatable=% insertable=%',
      updatable, insertable;
  end if;
end $$;

commit;
