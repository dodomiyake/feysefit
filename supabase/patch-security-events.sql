-- Security event log for auth abuse monitoring (idempotent).
-- Run in Supabase SQL Editor after schema.sql.

begin;

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  email_hash text,
  ip text,
  user_agent text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_events_created_at_idx
  on public.security_events (created_at desc);

create index if not exists security_events_type_created_idx
  on public.security_events (event_type, created_at desc);

alter table public.security_events enable row level security;
alter table public.security_events force row level security;

-- No direct table access for clients
revoke all on public.security_events from anon, authenticated;
grant select on public.security_events to authenticated;

drop policy if exists "security_events_admin_select" on public.security_events;
create policy "security_events_admin_select"
on public.security_events for select
to authenticated
using (public.is_admin());

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
    nullif(trim(coalesce(p_ip, '')), ''),
    left(nullif(trim(coalesce(p_user_agent, '')), ''), 512),
    coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_security_event(text, text, text, text, jsonb) from public;
grant execute on function public.log_security_event(text, text, text, text, jsonb) to anon, authenticated;

commit;
