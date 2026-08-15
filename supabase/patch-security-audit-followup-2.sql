-- FeyseFit security audit follow-up 2 (additive, rerunnable).
-- Apply AFTER supabase/patch-security-audit-followup.sql.
-- Do not treat edits to already-applied files as the live remedy.
--
-- ROLLBACK: supabase/rollback-security-audit-followup-2.sql
-- That rollback does not restore browser EXECUTE on logging RPCs,
-- public-image INSERT policies, or unscoped participant storage reads.

begin;

do $$
begin
  if to_regnamespace('app_private') is null then
    raise exception 'Missing schema app_private. Apply supabase/patch-security-audit-followup.sql first.';
  end if;
  if to_regprocedure('public.consume_rate_limit_server(text,text)') is null then
    raise exception 'Missing public.consume_rate_limit_server. Apply supabase/patch-security-audit-followup.sql first.';
  end if;
  if to_regprocedure('app_private.cleanup_rate_limit_counters()') is null then
    raise exception 'Missing app_private.cleanup_rate_limit_counters. Apply supabase/patch-security-audit-followup.sql first.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Account activity: browser roles lose EXECUTE. Service-role server wrapper.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.log_account_activity(text,text,text,text,jsonb)') is not null then
    execute 'revoke all on function public.log_account_activity(text, text, text, text, jsonb) from public, anon, authenticated';
  end if;
end $$;

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
set search_path = pg_catalog, public
as $$
begin
  raise exception 'not authorized' using errcode = '42501';
end;
$$;

revoke all on function public.log_account_activity(text, text, text, text, jsonb) from public, anon, authenticated;

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
set search_path = pg_catalog, public
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
    'payout_details_changed'
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

-- ---------------------------------------------------------------------------
-- app_private must not be callable via PostgREST browser roles
-- ---------------------------------------------------------------------------
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to postgres, service_role;

do $$
begin
  if to_regprocedure('app_private.consume_rate_limit(text,text)') is not null then
    execute 'revoke all on function app_private.consume_rate_limit(text, text) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.consume_rate_limit_server(text,text)') is not null then
    execute 'revoke all on function public.consume_rate_limit_server(text, text) from public, anon, authenticated';
    execute 'grant execute on function public.consume_rate_limit_server(text, text) to service_role';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Scheduled cleanup (pg_cron when available). A defined-but-never-run
-- function is not sufficient; this registers jobs when the extension exists.
-- ---------------------------------------------------------------------------
-- Catalog-row cleanup only. Deleting storage.objects does not purge Storage
-- backend bytes. Object bytes are removed by POST /auth/uploads/cleanup-quarantine
-- (service-role Storage API). See docs/security/storage-uploads.md.
create or replace function app_private.cleanup_quarantine_objects()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, storage, public
as $$
declare
  v_deleted integer := 0;
begin
  if to_regclass('storage.objects') is null then
    return 0;
  end if;
  delete from storage.objects
  where bucket_id = 'uploads-quarantine'
    and coalesce(created_at, updated_at, now()) < clock_timestamp() - interval '24 hours';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function app_private.cleanup_quarantine_objects() from public, anon, authenticated;
grant execute on function app_private.cleanup_quarantine_objects() to postgres, service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and to_regclass('cron.job') is not null then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname in (
      'feysefit-cleanup-rate-limits',
      'feysefit-cleanup-security-logs',
      'feysefit-cleanup-quarantine'
    );
    perform cron.schedule(
      'feysefit-cleanup-rate-limits',
      '15 * * * *',
      $cmd$select app_private.cleanup_rate_limit_counters()$cmd$
    );
    perform cron.schedule(
      'feysefit-cleanup-security-logs',
      '20 4 * * *',
      $cmd$select app_private.cleanup_security_logs()$cmd$
    );
    perform cron.schedule(
      'feysefit-cleanup-quarantine',
      '30 * * * *',
      $cmd$select app_private.cleanup_quarantine_objects()$cmd$
    );
  else
    raise notice 'pg_cron not installed; schedule cleanup jobs after enabling the extension';
  end if;
exception
  when others then
    raise notice 'pg_cron schedule skipped: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- Public image buckets: authenticated INSERT revoked. Promotion is service-role.
-- GIF disabled. Quarantine stays private.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is null then
    return;
  end if;

  update storage.buckets
  set public = false
  where id = 'uploads-quarantine';

  begin
    update storage.buckets
    set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
    where id in ('avatars', 'designer-portfolios', 'project-references', 'project-progress', 'customer-inspiration');
  exception
    when undefined_column then
      null;
  end;

  execute 'drop policy if exists "storage_insert_own_folder" on storage.objects';
  execute $sql$
    create policy "storage_insert_own_folder"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id in (
        'project-references',
        'project-progress',
        'customer-inspiration',
        'message-attachments',
        'uploads-quarantine'
      )
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  $sql$;
end $$;

-- Function privilege type is EXECUTE (not SELECT).
do $$
begin
  if to_regprocedure('public.can_read_private_storage_object(text)') is not null then
    execute 'revoke all on function public.can_read_private_storage_object(text) from public, anon';
    execute 'grant execute on function public.can_read_private_storage_object(text) to authenticated';
  end if;
end $$;

commit;
