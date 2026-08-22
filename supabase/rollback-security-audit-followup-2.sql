-- Rollback for patch-security-audit-followup-2.sql
-- Use only if follow-up 2 was applied and the matching application was NOT deployed.
--
-- This rollback does NOT restore:
--   - anon/authenticated EXECUTE on log_account_activity or consume_rate_limit
--   - authenticated INSERT on public image buckets (avatars / designer-portfolios)
--   - GIF as an allowed storage MIME type
--   - participant reads of unscoped private objects
--   - SECURITY DEFINER marketplace_testimonials

begin;

drop function if exists public.log_account_activity_server(text, uuid, text, text, jsonb);
drop function if exists app_private.cleanup_quarantine_objects();

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
  end if;
exception
  when others then
    raise notice 'pg_cron unschedule skipped: %', sqlerrm;
end $$;

-- Keep the public log_account_activity deny stub. Do not re-grant to browser roles.
do $$
begin
  if to_regprocedure('public.log_account_activity(text,text,text,text,jsonb)') is not null then
    execute 'revoke all on function public.log_account_activity(text, text, text, text, jsonb) from public, anon, authenticated';
  end if;
end $$;

-- Recreate the insert policy without public image buckets.
do $$
begin
  if to_regclass('storage.objects') is null then
    return;
  end if;
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

commit;
