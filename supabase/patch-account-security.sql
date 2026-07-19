-- Account security: password metadata + user-facing activity feed (idempotent).
-- Run in Supabase SQL Editor after patch-security-events.sql.

begin;

-- Last password change (nullable until the user changes password in-app).
alter table public.users
  add column if not exists password_changed_at timestamptz;

comment on column public.users.password_changed_at is
  'Set when the user changes password via the app; null means unknown / never recorded.';

-- User-facing account activity (privacy-redacted hints only — no full IPs).
create table if not exists public.account_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  event_type text not null,
  ip_hint text,
  device_hint text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists account_activity_user_created_idx
  on public.account_activity (user_id, created_at desc);

create index if not exists account_activity_type_created_idx
  on public.account_activity (event_type, created_at desc);

alter table public.account_activity enable row level security;
alter table public.account_activity force row level security;

revoke all on public.account_activity from anon, authenticated;
grant select on public.account_activity to authenticated;

drop policy if exists "account_activity_select_own" on public.account_activity;
create policy "account_activity_select_own"
on public.account_activity for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Redact IPv4 last octet / truncate IPv6 for storage and display.
create or replace function public.redact_ip_hint(p_ip text)
returns text
language plpgsql
immutable
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

create or replace function public.log_account_activity(
  p_event_type text,
  p_email text default null,
  p_ip text default null,
  p_user_agent text default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
begin
  if p_event_type not in (
    'login_succeeded',
    'login_failed',
    'password_changed',
    'email_changed',
    'mfa_enabled',
    'mfa_disabled',
    'sign_out_all_devices',
    'payment_details_changed',
    'payout_details_changed'
  ) then
    raise exception 'invalid account activity type';
  end if;

  -- Authenticated self-events must use the session user.
  if p_event_type in (
    'password_changed',
    'email_changed',
    'mfa_enabled',
    'mfa_disabled',
    'sign_out_all_devices',
    'payment_details_changed',
    'payout_details_changed'
  ) then
    if v_user_id is null then
      raise exception 'authentication required';
    end if;
  else
    -- login_* may attribute by email when there is no session yet.
    if v_user_id is null and v_email is not null then
      select u.id into v_user_id
      from public.users u
      where lower(u.email) = v_email
      limit 1;
    end if;
  end if;

  -- Silent no-op when account cannot be resolved (anti-enumeration).
  if v_user_id is null then
    return;
  end if;

  insert into public.account_activity (
    user_id,
    event_type,
    ip_hint,
    device_hint,
    meta
  )
  values (
    v_user_id,
    p_event_type,
    public.redact_ip_hint(p_ip),
    public.coarse_device_hint(p_user_agent),
    coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_account_activity(text, text, text, text, jsonb) from public;
grant execute on function public.log_account_activity(text, text, text, text, jsonb) to anon, authenticated;

-- Mark password change time for the signed-in user.
create or replace function public.mark_password_changed()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_at timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  update public.users
  set
    password_changed_at = v_at,
    updated_at = v_at
  where id = auth.uid();

  return v_at;
end;
$$;

revoke all on function public.mark_password_changed() from public;
grant execute on function public.mark_password_changed() to authenticated;

-- Also redact IPs going forward in the abuse log.
create or replace function public.log_security_event(
  p_event_type text,
  p_email_hash text default null,
  p_ip text default null,
  p_user_agent text default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_type not in (
    'login_failed',
    'login_succeeded',
    'login_cooldown',
    'signup_failed',
    'signup_succeeded',
    'password_reset_requested',
    'password_reset_limited',
    'verification_resend',
    'verification_resend_limited',
    'captcha_required',
    'captcha_failed',
    'auth_rate_limited'
  ) then
    raise exception 'invalid security event type';
  end if;

  insert into public.security_events (event_type, email_hash, ip, user_agent, meta)
  values (
    p_event_type,
    nullif(trim(coalesce(p_email_hash, '')), ''),
    public.redact_ip_hint(p_ip),
    left(nullif(trim(coalesce(p_user_agent, '')), ''), 512),
    coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

commit;
