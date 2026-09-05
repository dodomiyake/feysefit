-- Pin search_path on functions flagged by Supabase Security Advisor
-- (function_search_path_mutable). Additive follow-up: re-creates each
-- function with the exact same signature and body, only adding
-- `set search_path`, so this is a no-op for callers.
--
-- Run this entire file from line 1. Safe to re-run.

begin;

create or replace function public.project_status_blocks_unlink(p_status public.project_status)
returns boolean
language sql
immutable
set search_path = 'pg_catalog', 'public'
as $$
  select p_status::text not in ('Completed', 'Cancelled', 'Admin Support');
$$;

create or replace function public.is_messaging_shell_project(
  p_title text,
  p_outfit_type text,
  p_status public.project_status
)
returns boolean
language sql
immutable
set search_path = 'pg_catalog', 'public'
as $$
  select
    coalesce(p_outfit_type, '') = 'General'
    and coalesce(p_title, '') ilike '%— Messages%'
    and p_status = 'Enquiry';
$$;

create or replace function public.project_is_active_for_customer(target_status public.project_status)
returns boolean
language sql
immutable
set search_path = 'pg_catalog', 'public'
as $$
  select target_status not in (
    'Completed'::public.project_status
  );
$$;

create or replace function public.redact_ip_hint(p_ip text)
returns text
language plpgsql
immutable
set search_path = 'pg_catalog', 'public'
as $$
declare
  v text := nullif(trim(coalesce(p_ip, '')), '');
begin
  if v is null or v = 'unknown' then
    return null;
  end if;
  -- IPv4
  if v ~ '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' then
    return regexp_replace(v, '\.[0-9]{1,3}$', '.xxx');
  end if;
  -- IPv6 — keep first 2 hextets only
  if position(':' in v) > 0 then
    return split_part(v, ':', 1) || ':' || split_part(v, ':', 2) || ':…';
  end if;
  return 'hidden';
end;
$$;

create or replace function public.coarse_device_hint(p_user_agent text)
returns text
language plpgsql
immutable
set search_path = 'pg_catalog', 'public'
as $$
declare
  ua text := lower(coalesce(p_user_agent, ''));
  browser text := 'Browser';
  os text := 'device';
begin
  if ua = '' then
    return null;
  end if;

  if ua like '%edg/%' then
    browser := 'Edge';
  elsif ua like '%chrome/%' and ua not like '%edg/%' then
    browser := 'Chrome';
  elsif ua like '%firefox/%' then
    browser := 'Firefox';
  elsif ua like '%safari/%' and ua not like '%chrome/%' then
    browser := 'Safari';
  end if;

  if ua like '%android%' then
    os := 'Android';
  elsif ua like '%iphone%' or ua like '%ipad%' then
    os := 'iOS';
  elsif ua like '%windows%' then
    os := 'Windows';
  elsif ua like '%mac os%' or ua like '%macintosh%' then
    os := 'macOS';
  elsif ua like '%linux%' then
    os := 'Linux';
  end if;

  return browser || ' on ' || os;
end;
$$;

create or replace function public.touch_testimonial_updated_at()
returns trigger
language plpgsql
set search_path = 'pg_catalog', 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_delivery_issue_updated_at()
returns trigger
language plpgsql
set search_path = 'pg_catalog', 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

commit;
