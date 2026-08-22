-- FeyseFit: least-privilege function execute + durable rate-limit buckets
-- Apply AFTER patch-designer-private-details.sql.
-- Do NOT apply to production from this repository.
--
-- Trigger functions remain in public but are not granted as RPCs.
-- RLS helper functions stay executable because policies invoke them.
-- Mutation RPCs are authenticated-only (or revoked) and keep a fixed search_path.
--
-- ROLLBACK: supabase/rollback-function-execute-lockdown.sql

begin;

-- ---------------------------------------------------------------------------
-- Durable rate-limit counters (not an in-memory Map)
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limit_counters (
  bucket_key text primary key,
  hit_count integer not null,
  window_started_at timestamptz not null
);

alter table public.rate_limit_counters enable row level security;
alter table public.rate_limit_counters no force row level security;
-- Do not FORCE RLS: the SECURITY DEFINER owner must write counters.
-- anon/authenticated have no table grants, so REST cannot read this table.

revoke all on table public.rate_limit_counters from public, anon, authenticated;

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := left(trim(coalesce(p_bucket, '')), 128);
  v_limit integer := least(greatest(coalesce(p_limit, 0), 1), 10000);
  v_window integer := least(greatest(coalesce(p_window_seconds, 0), 1), 86400);
  v_now timestamptz := now();
  v_row public.rate_limit_counters%rowtype;
  v_inserted integer;
begin
  if v_key = '' then
    return false;
  end if;

  insert into public.rate_limit_counters (bucket_key, hit_count, window_started_at)
  values (v_key, 1, v_now)
  on conflict (bucket_key) do nothing;
  get diagnostics v_inserted = row_count;

  -- Insert already records the first hit. Do not increment again on this call.
  if v_inserted = 1 then
    return true;
  end if;

  select * into v_row
  from public.rate_limit_counters
  where bucket_key = v_key
  for update;

  if not found then
    return false;
  end if;

  if v_row.window_started_at + make_interval(secs => v_window) <= v_now then
    update public.rate_limit_counters
    set hit_count = 1,
        window_started_at = v_now
    where bucket_key = v_key;
    return true;
  end if;

  if v_row.hit_count >= v_limit then
    return false;
  end if;

  update public.rate_limit_counters
  set hit_count = hit_count + 1
  where bucket_key = v_key;
  return true;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, integer, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Revoke PUBLIC execute from every public function (re-grant below)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.proname as name, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
  loop
    execute format(
      'revoke all on function public.%I(%s) from public, anon, authenticated',
      r.name,
      r.args
    );
  end loop;
end $$;

-- Re-grant by function name so signature drift across patches does not abort.
do $$
declare
  r record;
  anon_or_auth text[] := array[
    'current_user_role',
    'is_admin',
    'current_designer_profile_id',
    'current_customer_profile_id',
    'lookup_invite_code',
    'consume_rate_limit',
    'log_security_event'
  ];
  auth_only text[] := array[
    'accept_customer_invite',
    'apply_customer_measurement_submission',
    'apply_customer_project_designer_update',
    'update_customer_fabric_selection',
    'mark_customer_project_concluded',
    'link_customer_to_marketplace_designer',
    'confirm_customer_project_delivery',
    'report_customer_delivery_issue',
    'get_designer_availability_calendar',
    'get_designer_appointment_holds',
    'mark_password_changed',
    'own_designer_profile',
    'log_account_activity',
    'approve_customer_unlink',
    'deactivate_customer_relationships',
    'admin_get_designer_moderation',
    'admin_set_designer_notes',
    'admin_lookup_profiles_by_user_ids',
    'can_read_private_storage_object',
    'designer_has_active_relationship',
    'designer_owns_studio_client',
    'designer_authorized_for_project',
    'designer_owns_active_customer_link',
    'designer_has_archived_project_access',
    'designer_can_read_project',
    'project_messaging_allowed',
    'customer_may_book_designer',
    'project_is_active_for_customer',
    'is_messaging_shell_project',
    'project_status_blocks_unlink'
  ];
begin
  for r in
    select p.proname as name, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname = any (anon_or_auth)
  loop
    execute format('grant execute on function public.%I(%s) to anon, authenticated', r.name, r.args);
  end loop;

  for r in
    select p.proname as name, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname = any (auth_only)
  loop
    execute format('grant execute on function public.%I(%s) to authenticated', r.name, r.args);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Harden event loggers (no forged privileged events, durable throttle)
-- ---------------------------------------------------------------------------
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
declare
  v_bucket text;
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

  v_bucket := 'sec:' || left(md5(coalesce(nullif(trim(p_ip), ''), 'unknown')), 32);
  if public.consume_rate_limit(v_bucket, 30, 60) is distinct from true then
    return;
  end if;

  insert into public.security_events (event_type, email_hash, ip, user_agent, meta)
  values (
    p_event_type,
    nullif(trim(coalesce(p_email_hash, '')), ''),
    left(nullif(trim(coalesce(p_ip, '')), ''), 64),
    left(nullif(trim(coalesce(p_user_agent, '')), ''), 512),
    coalesce(p_meta, '{}'::jsonb)
  );
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
  v_bucket text;
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

  if v_user_id is null then
    -- Anonymous callers cannot write account activity (prevents forged events).
    return;
  end if;

  if p_event_type in (
    'password_changed',
    'email_changed',
    'mfa_enabled',
    'mfa_disabled',
    'sign_out_all_devices',
    'payment_details_changed',
    'payout_details_changed'
  ) then
    null; -- session user already required
  end if;

  v_bucket := 'acct:' || v_user_id::text;
  if public.consume_rate_limit(v_bucket, 40, 60) is distinct from true then
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

create or replace function public.deactivate_customer_relationships(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_customer_id is null then
    raise exception 'customer id required';
  end if;

  if public.is_admin() then
    if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
      raise exception 'not authorized';
    end if;
  elsif p_customer_id is distinct from public.current_customer_profile_id() then
    raise exception 'Not authorized to deactivate relationships';
  end if;

  update public.designer_customer_relationships
  set is_active = false
  where customer_id = p_customer_id
    and is_active = true;
end;
$$;

create or replace function public.approve_customer_unlink(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_designer_id uuid;
  v_blocking_count integer;
begin
  if auth.uid() is null
     or not public.is_admin()
     or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'not authorized';
  end if;

  select customer_id, designer_id
  into v_customer_id, v_designer_id
  from public.unlink_requests
  where id = p_request_id;

  if v_customer_id is null or v_designer_id is null then
    raise exception 'Unlink request not found';
  end if;

  select count(*)::integer
  into v_blocking_count
  from public.projects p
  where p.customer_id = v_customer_id
    and p.designer_id = v_designer_id
    and public.project_status_blocks_unlink(p.status)
    and not public.is_messaging_shell_project(p.title, p.outfit_type, p.status);

  if v_blocking_count > 0 then
    raise exception
      'Cannot approve unlink while % active project(s) remain. Complete, cancel, or escalate them to Admin Support first.',
      v_blocking_count;
  end if;

  update public.unlink_requests
  set status = 'approved'
  where id = p_request_id;

  update public.unlink_requests
  set
    status = 'declined',
    admin_notes = coalesce(admin_notes, 'Closed as duplicate of the approved unlink request.'),
    designer_response = coalesce(designer_response, 'Superseded by approved unlink request.'),
    designer_responded_at = coalesce(designer_responded_at, now())
  where customer_id = v_customer_id
    and id <> p_request_id
    and status in ('pending', 'designer_review');

  update public.customer_profiles
  set
    unlink_status = 'approved',
    unlink_reason = null,
    unlink_submitted_at = null,
    active_unlink_request_id = p_request_id
  where id = v_customer_id;

  update public.projects
  set relationship_archived_at = coalesce(relationship_archived_at, now())
  where customer_id = v_customer_id
    and designer_id = v_designer_id;

  update public.designer_customer_relationships
  set is_active = false
  where customer_id = v_customer_id
    and is_active = true;
end;
$$;

-- Public invite lookup: keep the public-safe payload, throttle brute-force.
create or replace function public.lookup_invite_code(invite_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  invite_row public.invite_codes%rowtype;
  designer_row public.designer_profiles%rowtype;
  v_bucket text;
begin
  normalized := upper(trim(invite_code));
  if normalized = '' then
    return null;
  end if;

  v_bucket := 'invite:' || left(md5(normalized), 32);
  if public.consume_rate_limit(v_bucket, 20, 60) is distinct from true then
    return null;
  end if;

  select * into invite_row
  from public.invite_codes
  where code = normalized;

  if not found then
    return null;
  end if;

  select * into designer_row
  from public.designer_profiles
  where id = invite_row.designer_id;

  return json_build_object(
    'id', invite_row.id,
    'legacy_id', invite_row.legacy_id,
    'code', invite_row.code,
    'name', invite_row.name,
    'project_type', invite_row.project_type,
    'sent_at', invite_row.sent_at,
    'sent_ago', invite_row.sent_ago,
    'status', invite_row.status,
    'designer_name', coalesce(designer_row.designer_name, designer_row.business_name, 'Your designer'),
    'business_name', coalesce(designer_row.business_name, ''),
    'designer_legacy_id', coalesce(designer_row.legacy_id, designer_row.id::text)
  );
end;
$$;

revoke all on function public.lookup_invite_code(text) from public;
grant execute on function public.lookup_invite_code(text) to anon, authenticated;

-- recompute_designer_testimonial_stats is trigger-only — do not re-grant as RPC.
-- enforce_* trigger functions are likewise not granted.

commit;
