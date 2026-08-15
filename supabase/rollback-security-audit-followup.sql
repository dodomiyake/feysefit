-- Rollback for patch-security-audit-followup.sql
-- Use only if the follow-up SQL was applied and the new application was NOT deployed.
--
-- This rollback does NOT restore:
--   - anon/authenticated EXECUTE on consume_rate_limit or log_security_event
--   - table-level SELECT on designer_profiles private columns
--   - authenticated UPDATE on rating / review_count / marketplace_live
--   - participant reads of unscoped private storage objects
--   - SECURITY DEFINER marketplace_testimonials
--   - TRUNCATE / TRIGGER / REFERENCES grants to anon/authenticated
--   - PUBLIC default privileges on new tables/functions

begin;

drop trigger if exists trg_messages_rate_limit on public.messages;
drop trigger if exists trg_projects_rate_limit on public.projects;

drop function if exists app_private.enforce_messaging_rate_limit();
drop function if exists app_private.enforce_design_request_rate_limit();
drop function if exists app_private.uid_rate_limit_bucket();
drop function if exists public.lookup_invite_code_server(text);
drop function if exists app_private.lookup_invite_public(text);
drop function if exists public.consume_rate_limit_server(text, text);
drop function if exists public.admin_set_marketplace_live(uuid, boolean);
drop function if exists public.withdraw_own_marketplace_listing();
drop function if exists app_private.cleanup_rate_limit_counters();
drop function if exists app_private.cleanup_security_logs();
drop function if exists app_private.consume_rate_limit(text, text);

drop table if exists app_private.rate_limit_policies;

-- Keep public.consume_rate_limit as a deny stub. Do not re-grant to anon.
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;

-- Keep invite public RPC returning null.
revoke all on function public.lookup_invite_code(text) from public, anon, authenticated;

-- Keep logging off browser roles.
do $$
begin
  if to_regprocedure('public.log_security_event(text,text,text,text,jsonb)') is not null then
    execute 'revoke all on function public.log_security_event(text, text, text, text, jsonb) from public, anon, authenticated';
  end if;
end $$;

drop policy if exists "quarantine_owner_insert" on storage.objects;
drop policy if exists "quarantine_owner_select" on storage.objects;
drop policy if exists "quarantine_owner_delete" on storage.objects;

commit;
