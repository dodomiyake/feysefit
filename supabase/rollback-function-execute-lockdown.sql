-- ROLLBACK for patch-function-execute-lockdown.sql
-- Does not restore PUBLIC execute.
-- Does not restore browser EXECUTE on consume_rate_limit, log_security_event,
-- or log_account_activity. Those stay a trusted-server boundary.

begin;

do $$
begin
  if to_regprocedure('public.log_security_event(text,text,text,text,jsonb)') is not null then
    execute 'revoke all on function public.log_security_event(text, text, text, text, jsonb) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.log_account_activity(text,text,text,text,jsonb)') is not null then
    execute 'revoke all on function public.log_account_activity(text, text, text, text, jsonb) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.consume_rate_limit(text,integer,integer)') is not null then
    execute 'revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated';
  end if;
end $$;

commit;
