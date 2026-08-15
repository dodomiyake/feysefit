-- ROLLBACK for patch-function-execute-lockdown.sql
-- Re-grants execute to authenticated for common RPCs. Does not restore PUBLIC execute.

begin;

grant execute on function public.log_security_event(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.log_account_activity(text, text, text, text, jsonb) to anon, authenticated;

commit;
