-- FeyseFit security audit follow-up (additive).
-- Apply AFTER the first hardening patches. Do NOT amend already-applied files
-- as the only remedy — the live database already received those patches.
--
-- ROLLBACK: supabase/rollback-security-audit-followup.sql
-- That rollback does not restore anonymous privacy exposure, blanket table
-- privileges, or browser EXECUTE on consume_rate_limit / log_security_event.
--
-- Transactional and safely rerunnable.

begin;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to postgres, service_role;
grant all on schema app_private to postgres, service_role;

alter table if exists public.rate_limit_counters
  add column if not exists operation text;

create table if not exists app_private.rate_limit_policies (
  operation text primary key,
  hit_limit integer not null check (hit_limit >= 1 and hit_limit <= 1000),
  window_seconds integer not null check (window_seconds >= 1 and window_seconds <= 86400)
);

insert into app_private.rate_limit_policies (operation, hit_limit, window_seconds)
values
  ('auth_abuse', 20, 60),
  ('admin_mutation', 30, 60),
  ('security_event', 30, 60),
  ('account_activity', 40, 60),
  ('design_request', 20, 60),
  ('messaging_write', 40, 60),
  ('invite_email', 10, 60),
  ('invite_lookup', 20, 60),
  ('invite_lookup_global', 120, 60),
  ('reference_preview', 30, 60)
on conflict (operation) do update
set hit_limit = excluded.hit_limit,
    window_seconds = excluded.window_seconds;

create or replace function app_private.consume_rate_limit(
  p_operation text,
  p_bucket text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_op text := left(lower(trim(coalesce(p_operation, ''))), 64);
  v_key text := left(trim(coalesce(p_bucket, '')), 64);
  v_policy app_private.rate_limit_policies%rowtype;
  v_now timestamptz := clock_timestamp();
  v_row public.rate_limit_counters%rowtype;
  v_inserted integer;
  v_composite text;
begin
  if v_op = '' or v_key = '' or v_key !~ '^[0-9a-f]{16,64}$' then
    return false;
  end if;

  select * into v_policy
  from app_private.rate_limit_policies
  where operation = v_op;
  if not found then
    return false;
  end if;

  v_composite := left(v_op || ':' || v_key, 128);

  insert into public.rate_limit_counters (bucket_key, hit_count, window_started_at, operation)
  values (v_composite, 1, v_now, v_op)
  on conflict (bucket_key) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    return true;
  end if;

  select * into v_row
  from public.rate_limit_counters
  where bucket_key = v_composite
  for update;

  if not found then
    return false;
  end if;

  if v_row.window_started_at + make_interval(secs => v_policy.window_seconds) <= v_now then
    update public.rate_limit_counters
    set hit_count = 1,
        window_started_at = v_now,
        operation = v_op
    where bucket_key = v_composite;
    return true;
  end if;

  if v_row.hit_count >= v_policy.hit_limit then
    return false;
  end if;

  update public.rate_limit_counters
  set hit_count = hit_count + 1,
      operation = v_op
  where bucket_key = v_composite;
  return true;
end;
$$;

revoke all on function app_private.consume_rate_limit(text, text) from public, anon, authenticated;
grant execute on function app_private.consume_rate_limit(text, text) to postgres, service_role;

-- Trusted server wrapper. PostgREST exposes public only; grant service_role.
create or replace function public.consume_rate_limit_server(
  p_operation text,
  p_bucket text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
begin
  return app_private.consume_rate_limit(p_operation, p_bucket);
end;
$$;

revoke all on function public.consume_rate_limit_server(text, text) from public, anon, authenticated;
grant execute on function public.consume_rate_limit_server(text, text) to service_role;

-- Old browser-callable limiter: keep signature, deny everyone except owners.
create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'not authorized' using errcode = '42501';
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;

create or replace function app_private.cleanup_rate_limit_counters()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limit_counters
  where window_started_at < clock_timestamp() - interval '2 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function app_private.cleanup_rate_limit_counters() from public, anon, authenticated;
grant execute on function app_private.cleanup_rate_limit_counters() to postgres, service_role;

create or replace function app_private.cleanup_security_logs()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_deleted integer := 0;
  v_chunk integer;
begin
  if to_regclass('public.security_events') is not null then
    delete from public.security_events
    where created_at < clock_timestamp() - interval '90 days';
    get diagnostics v_chunk = row_count;
    v_deleted := v_deleted + v_chunk;
  end if;
  if to_regclass('public.account_activity') is not null then
    delete from public.account_activity
    where created_at < clock_timestamp() - interval '90 days';
    get diagnostics v_chunk = row_count;
    v_deleted := v_deleted + v_chunk;
  end if;
  return v_deleted;
end;
$$;

revoke all on function app_private.cleanup_security_logs() from public, anon, authenticated;
grant execute on function app_private.cleanup_security_logs() to postgres, service_role;

comment on function app_private.cleanup_rate_limit_counters() is
  'Deletes rate_limit_counters rows older than 2 days. Schedule via pg_cron or an operator job.';
comment on function app_private.cleanup_security_logs() is
  'Deletes security_events and account_activity older than 90 days. Schedule via pg_cron or an operator job.';

-- ---------------------------------------------------------------------------
-- Logging RPCs: browser roles lose EXECUTE. Service role only.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.log_security_event(text,text,text,text,jsonb)') is not null then
    execute 'revoke all on function public.log_security_event(text, text, text, text, jsonb) from public, anon, authenticated';
    execute 'grant execute on function public.log_security_event(text, text, text, text, jsonb) to service_role';
  end if;
  if to_regprocedure('public.log_account_activity(text,text,text,text,jsonb)') is not null then
    execute 'revoke all on function public.log_account_activity(text, text, text, text, jsonb) from public, anon, authenticated';
    execute 'grant execute on function public.log_account_activity(text, text, text, text, jsonb) to service_role';
  end if;
end $$;

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
set search_path = pg_catalog, public, app_private
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

  v_bucket := left(md5(coalesce(nullif(trim(p_ip), ''), 'unknown')), 64);
  if app_private.consume_rate_limit('security_event', v_bucket) is distinct from true then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.security_events (event_type, email_hash, ip, user_agent, meta)
  values (
    p_event_type,
    left(nullif(trim(coalesce(p_email_hash, '')), ''), 64),
    left(nullif(trim(coalesce(p_ip, '')), ''), 64),
    left(nullif(trim(coalesce(p_user_agent, '')), ''), 512),
    coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_security_event(text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.log_security_event(text, text, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Invite lookup: no browser RPC. Private lookup returns public-safe fields only.
-- ---------------------------------------------------------------------------
alter table if exists public.invite_codes
  add column if not exists expires_at timestamptz;

update public.invite_codes
set expires_at = coalesce(created_at, now()) + interval '14 days'
where expires_at is null;

alter table if exists public.invite_codes
  alter column expires_at set default (now() + interval '14 days');

create or replace function app_private.lookup_invite_public(p_code text)
returns json
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  normalized text;
  invite_row public.invite_codes%rowtype;
  designer_row public.designer_profiles%rowtype;
begin
  normalized := upper(trim(coalesce(p_code, '')));
  if normalized = '' then
    return null;
  end if;

  select * into invite_row
  from public.invite_codes
  where code = normalized;

  if not found
     or invite_row.status is distinct from 'pending'
     or invite_row.expires_at <= clock_timestamp() then
    return null;
  end if;

  select * into designer_row
  from public.designer_profiles
  where id = invite_row.designer_id;

  return json_build_object(
    'name', invite_row.name,
    'project_type', invite_row.project_type,
    'designer_name', coalesce(designer_row.designer_name, designer_row.business_name, 'Your designer'),
    'business_name', coalesce(designer_row.business_name, '')
  );
end;
$$;

revoke all on function app_private.lookup_invite_public(text) from public, anon, authenticated;
grant execute on function app_private.lookup_invite_public(text) to postgres, service_role;

create or replace function public.lookup_invite_code_server(p_code text)
returns json
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
begin
  return app_private.lookup_invite_public(p_code);
end;
$$;

revoke all on function public.lookup_invite_code_server(text) from public, anon, authenticated;
grant execute on function public.lookup_invite_code_server(text) to service_role;

create or replace function public.lookup_invite_code(invite_code text)
returns json
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  return null;
end;
$$;

revoke all on function public.lookup_invite_code(text) from public, anon, authenticated;

create or replace function public.accept_customer_invite(invite_code text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  linked_customer_id uuid;
  customer_email text;
  invite_row public.invite_codes%rowtype;
  normalized_code text;
begin
  normalized_code := upper(trim(invite_code));
  if normalized_code = '' then
    raise exception 'This invitation cannot be used';
  end if;

  linked_customer_id := public.current_customer_profile_id();
  if linked_customer_id is null then
    raise exception 'This invitation cannot be used';
  end if;

  select email into customer_email
  from public.customer_profiles
  where id = linked_customer_id;

  select * into invite_row
  from public.invite_codes
  where code = normalized_code
    and status = 'pending'
    and expires_at > clock_timestamp()
  for update;

  if not found then
    return;
  end if;

  if customer_email not like '%@invite.local'
     and lower(customer_email) <> lower(invite_row.email) then
    raise exception 'This invitation cannot be used';
  end if;

  insert into public.designer_customer_relationships (
    designer_id,
    customer_id,
    registration_type,
    is_active
  )
  values (
    invite_row.designer_id,
    linked_customer_id,
    'invited',
    true
  )
  on conflict (designer_id, customer_id) do update
    set registration_type = 'invited',
        is_active = true;

  update public.customer_profiles
  set registration_type = 'invited'
  where id = linked_customer_id;

  update public.invite_codes
  set status = 'accepted'
  where id = invite_row.id;
end;
$$;

revoke all on function public.accept_customer_invite(text) from public, anon;
grant execute on function public.accept_customer_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Marketplace integrity fields
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.designer_profiles') is not null then
    execute 'revoke update (rating, review_count, marketplace_live) on table public.designer_profiles from public, anon, authenticated';
  end if;
end $$;

create or replace function public.admin_set_marketplace_live(
  p_designer_id uuid,
  p_live boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin_aal2() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.designer_profiles
  set marketplace_live = coalesce(p_live, false),
      updated_at = now()
  where id = p_designer_id;
end;
$$;

revoke all on function public.admin_set_marketplace_live(uuid, boolean) from public, anon;
grant execute on function public.admin_set_marketplace_live(uuid, boolean) to authenticated;

create or replace function public.withdraw_own_marketplace_listing()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid := public.current_designer_profile_id();
begin
  if v_id is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  update public.designer_profiles
  set marketplace_live = false,
      updated_at = now()
  where id = v_id
    and marketplace_live = true;
end;
$$;

revoke all on function public.withdraw_own_marketplace_listing() from public, anon;
grant execute on function public.withdraw_own_marketplace_listing() to authenticated;

do $$
begin
  if to_regprocedure('public.recompute_designer_testimonial_stats(uuid)') is not null then
    execute 'revoke all on function public.recompute_designer_testimonial_stats(uuid) from public, anon, authenticated';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Private storage: deny participant access to unscoped legacy objects
-- ---------------------------------------------------------------------------
create or replace function public.can_read_private_storage_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with parts as (
    select
      (storage.foldername(object_name))[1] as owner_id,
      (storage.foldername(object_name))[2] as second_segment
  ),
  scoped as (
    select
      owner_id,
      case
        when second_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then second_segment::uuid
        else null
      end as project_id
    from parts
  )
  select
    auth.uid() is not null
    and (
      exists (
        select 1 from scoped s where s.owner_id = auth.uid()::text
      )
      or public.is_admin_aal2()
      or exists (
        select 1
        from scoped s
        join public.projects p on p.id = s.project_id
        join public.customer_profiles cp on cp.id = p.customer_id
        join public.designer_profiles dp on dp.id = p.designer_id
        left join public.designer_customer_relationships rel
          on rel.designer_id = dp.id
         and rel.customer_id = cp.id
        where s.project_id is not null
          and coalesce(p.status::text, '') not in ('Archived', 'Unlinked')
          and coalesce(rel.is_active, true) = true
          and (dp.user_id = auth.uid() or cp.user_id = auth.uid())
      )
    );
$$;

revoke all on function public.can_read_private_storage_object(text) from public, anon;
grant execute on function public.can_read_private_storage_object(text) to authenticated;

-- ---------------------------------------------------------------------------
-- SECURITY INVOKER public testimonials view
-- ---------------------------------------------------------------------------
revoke all on table public.testimonials from public, anon;

grant select (
  id,
  legacy_id,
  designer_id,
  rating,
  body,
  outfit_type,
  photo_url,
  allow_public,
  show_name,
  show_location,
  display_name,
  display_location,
  status,
  created_at,
  updated_at
) on table public.testimonials to anon;

grant select on table public.testimonials to authenticated;

drop policy if exists "testimonials_public_read" on public.testimonials;
drop policy if exists "testimonials_anon_public_read" on public.testimonials;
create policy "testimonials_anon_public_read"
on public.testimonials
for select
to anon
using (allow_public = true and status = 'active'::public.testimonial_status);

drop view if exists public.marketplace_testimonials;
create view public.marketplace_testimonials
with (security_invoker = true) as
select
  public_rows.id,
  public_rows.legacy_id,
  public_rows.designer_id,
  public_rows.rating,
  public_rows.body,
  public_rows.outfit_type,
  public_rows.photo_url,
  public_rows.allow_public,
  public_rows.show_name,
  public_rows.show_location,
  public_rows.display_name,
  public_rows.display_location,
  public_rows.status,
  public_rows.created_at,
  public_rows.updated_at
from (
  select
    t.id,
    t.legacy_id,
    t.designer_id,
    t.rating,
    t.body,
    t.outfit_type,
    t.photo_url,
    t.allow_public,
    t.show_name,
    t.show_location,
    t.display_name,
    t.display_location,
    t.status,
    t.created_at,
    t.updated_at
  from public.testimonials t
  where t.allow_public = true
    and t.status = 'active'::public.testimonial_status
) public_rows;

comment on view public.marketplace_testimonials is
  'security_invoker public projection. Base-table RLS (allow_public + active) plus column grants. No customer_id, project_id, private_feedback, or moderation fields.';

alter view public.marketplace_testimonials set (security_invoker = true);

revoke all on table public.marketplace_testimonials from public, anon, authenticated;
grant select on table public.marketplace_testimonials to anon, authenticated;

do $$
declare
  v record;
begin
  select is_updatable, is_insertable_into
    into v
  from information_schema.views
  where table_schema = 'public'
    and table_name = 'marketplace_testimonials';
  if v.is_updatable <> 'NO' or v.is_insertable_into <> 'NO' then
    raise exception 'marketplace_testimonials is still updatable';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Privileges: revoke TRUNCATE / TRIGGER / REFERENCES / default ACLs
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
  seq record;
begin
  for t in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'revoke truncate, trigger, references on table %I.%I from public, anon, authenticated',
      t.schemaname,
      t.tablename
    );
    execute format(
      'revoke all on table %I.%I from public',
      t.schemaname,
      t.tablename
    );
  end loop;

  for seq in
    select sequence_schema, sequence_name
    from information_schema.sequences
    where sequence_schema = 'public'
  loop
    execute format(
      'revoke all on sequence %I.%I from public, anon, authenticated',
      seq.sequence_schema,
      seq.sequence_name
    );
  end loop;
end $$;

alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    execute $sql$
      alter default privileges for role supabase_admin in schema public
        revoke all on tables from public, anon, authenticated
    $sql$;
    execute $sql$
      alter default privileges for role supabase_admin in schema public
        revoke all on sequences from public, anon, authenticated
    $sql$;
    execute $sql$
      alter default privileges for role supabase_admin in schema public
        revoke all on functions from public, anon, authenticated
    $sql$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RLS: force where compatible; keep rate_limit_counters owner-only
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.project_items') is not null then
    execute 'alter table public.project_items enable row level security';
    execute 'alter table public.project_items force row level security';
  end if;
  if to_regclass('public.rate_limit_counters') is not null then
    execute 'alter table public.rate_limit_counters enable row level security';
    execute 'revoke all on table public.rate_limit_counters from public, anon, authenticated';
  end if;
  if to_regclass('public.testimonials') is not null then
    execute 'alter table public.testimonials enable row level security';
    execute 'alter table public.testimonials force row level security';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Messaging / project write throttles (server-chosen operation, uid bucket)
-- ---------------------------------------------------------------------------
create or replace function app_private.uid_rate_limit_bucket()
returns text
language sql
stable
set search_path = pg_catalog, public
as $$
  select left(md5(coalesce(auth.uid()::text, 'anonymous')), 64);
$$;

create or replace function app_private.enforce_messaging_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
begin
  if app_private.consume_rate_limit('messaging_write', app_private.uid_rate_limit_bucket())
     is distinct from true then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function app_private.enforce_design_request_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
begin
  if app_private.consume_rate_limit('design_request', app_private.uid_rate_limit_bucket())
     is distinct from true then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function app_private.enforce_messaging_rate_limit() from public, anon, authenticated;
revoke all on function app_private.enforce_design_request_rate_limit() from public, anon, authenticated;
revoke all on function app_private.uid_rate_limit_bucket() from public, anon, authenticated;

drop trigger if exists trg_messages_rate_limit on public.messages;
do $$
begin
  if to_regclass('public.messages') is not null then
    execute $sql$
      create trigger trg_messages_rate_limit
      before insert on public.messages
      for each row
      execute function app_private.enforce_messaging_rate_limit()
    $sql$;
  end if;
end $$;

drop trigger if exists trg_projects_rate_limit on public.projects;
do $$
begin
  if to_regclass('public.projects') is not null then
    execute $sql$
      create trigger trg_projects_rate_limit
      before insert on public.projects
      for each row
      execute function app_private.enforce_design_request_rate_limit()
    $sql$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Mutable search_path: pin every public function that lacks one
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid,
           n.nspname,
           p.proname,
           pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind in ('f', 'p')
      and (
        p.proconfig is null
        or not exists (
          select 1
          from unnest(coalesce(p.proconfig, array[]::text[])) cfg
          where cfg like 'search_path=%'
        )
      )
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = pg_catalog, public',
      r.nspname,
      r.proname,
      r.args
    );
  end loop;
end $$;

do $$
declare
  names text[] := array[
    'project_status_blocks_unlink',
    'touch_testimonial_updated_at',
    'redact_ip_hint',
    'touch_delivery_issue_updated_at',
    'coarse_device_hint',
    'is_messaging_shell_project',
    'project_is_active_for_customer'
  ];
  fname text;
  r record;
begin
  foreach fname in array names loop
    for r in
      select pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = fname
    loop
      execute format(
        'alter function public.%I(%s) set search_path = pg_catalog, public',
        fname,
        r.args
      );
    end loop;
  end loop;
end $$;

-- New functions must not default-grant EXECUTE to PUBLIC.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema app_private revoke execute on functions from public;

-- Quarantine bucket (no auto-delete of existing objects)
do $$
begin
  if to_regclass('storage.buckets') is null then
    return;
  end if;
  insert into storage.buckets (id, name, public)
  values ('uploads-quarantine', 'uploads-quarantine', false)
  on conflict (id) do update set public = false;

  execute 'drop policy if exists "quarantine_owner_insert" on storage.objects';
  execute $sql$
    create policy "quarantine_owner_insert"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'uploads-quarantine'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  $sql$;
  execute 'drop policy if exists "quarantine_owner_select" on storage.objects';
  execute $sql$
    create policy "quarantine_owner_select"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'uploads-quarantine'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  $sql$;
  execute 'drop policy if exists "quarantine_owner_delete" on storage.objects';
  execute $sql$
    create policy "quarantine_owner_delete"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'uploads-quarantine'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  $sql$;
end $$;

commit;
