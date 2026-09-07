-- Concurrent session visibility + detection.
-- Adds a self-service "list my active sessions" RPC (reads auth.sessions,
-- scoped to auth.uid(), never exposes raw ip/user_agent — only the existing
-- redact_ip_hint()/coarse_device_hint() projections) and extends
-- log_account_activity_server with a new event type so the app can record
-- when a login happens while another session is already active.
--
-- Run this entire file from line 1. Safe to re-run.

begin;

create or replace function public.list_own_active_sessions()
returns table (
  session_id uuid,
  is_current boolean,
  device_hint text,
  ip_hint text,
  created_at timestamptz,
  last_active_at timestamptz
)
language sql
stable
security definer
set search_path = 'pg_catalog', 'public'
as $$
  select
    s.id as session_id,
    s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid as is_current,
    public.coarse_device_hint(s.user_agent) as device_hint,
    public.redact_ip_hint(s.ip::text) as ip_hint,
    s.created_at,
    coalesce(s.refreshed_at, s.updated_at) as last_active_at
  from auth.sessions s
  where s.user_id = auth.uid()
    and (s.not_after is null or s.not_after > now())
  order by coalesce(s.refreshed_at, s.updated_at) desc;
$$;

revoke all on function public.list_own_active_sessions() from public, anon, authenticated;
grant execute on function public.list_own_active_sessions() to authenticated;

create or replace function public.log_account_activity_server(
  p_event_type text,
  p_user_id uuid,
  p_ip text default null,
  p_user_agent text default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
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
    'payout_details_changed',
    'concurrent_session_detected'
  ) then
    raise exception 'invalid account activity type';
  end if;

  if p_user_id is null then
    return;
  end if;
  if to_regclass('public.account_activity') is null then
    return;
  end if;

  if octet_length(coalesce(p_meta::text, '{}')) > 2048 then
    raise exception 'meta too large';
  end if;

  insert into public.account_activity (
    user_id,
    event_type,
    ip_hint,
    device_hint,
    meta
  )
  values (
    p_user_id,
    p_event_type,
    public.redact_ip_hint(p_ip),
    public.coarse_device_hint(p_user_agent),
    coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_account_activity_server(text, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.log_account_activity_server(text, uuid, text, text, jsonb) to service_role;

commit;
