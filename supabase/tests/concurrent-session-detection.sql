-- Assertions for patch-concurrent-session-detection.sql (staging only; ROLLBACK).
-- Run after: schema.sql baseline, patch-account-security.sql,
-- patch-security-audit-followup-2.sql, patch-concurrent-session-detection.sql.

begin;

do $grants$
begin
  if has_function_privilege('anon', 'public.list_own_active_sessions()', 'EXECUTE') then
    raise exception 'FAIL: anon can execute list_own_active_sessions';
  end if;
  if not has_function_privilege('authenticated', 'public.list_own_active_sessions()', 'EXECUTE') then
    raise exception 'FAIL: authenticated cannot execute list_own_active_sessions';
  end if;
  raise notice 'PASS: list_own_active_sessions is authenticated-only';
end $grants$;

do $scoping$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  session_a1 uuid := gen_random_uuid();
  session_a2 uuid := gen_random_uuid();
  session_b1 uuid := gen_random_uuid();
  rows_seen int;
  current_flag boolean;
begin
  insert into auth.users (id, email) values
    (user_a, 'session-a@example.com'),
    (user_b, 'session-b@example.com');

  insert into auth.sessions (id, user_id, created_at, refreshed_at, user_agent, ip, not_after)
  values
    (session_a1, user_a, now() - interval '1 hour', now() - interval '1 minute', 'Mozilla/5.0 (Windows NT 10.0) Chrome/120', '203.0.113.5', null),
    (session_a2, user_a, now() - interval '2 days', now() - interval '2 days', 'Mozilla/5.0 (iPhone) Safari/604', '198.51.100.9', null),
    (session_b1, user_b, now(), now(), 'Mozilla/5.0 (Linux) Firefox/121', '203.0.113.5', null);

  perform set_config('request.jwt.claim.sub', user_a::text, true);
  perform set_config('request.jwt.claim.session_id', session_a1::text, true);

  select count(*) into rows_seen from public.list_own_active_sessions();
  if rows_seen <> 2 then
    raise exception 'FAIL: user A should see exactly their own 2 sessions, saw %', rows_seen;
  end if;

  select is_current into current_flag
  from public.list_own_active_sessions()
  where session_id = session_a1;
  if current_flag is not true then
    raise exception 'FAIL: session_a1 should be flagged is_current';
  end if;

  select is_current into current_flag
  from public.list_own_active_sessions()
  where session_id = session_a2;
  if current_flag is not false then
    raise exception 'FAIL: session_a2 should not be flagged is_current';
  end if;

  if exists (select 1 from public.list_own_active_sessions() where session_id = session_b1) then
    raise exception 'FAIL: user A can see user B session';
  end if;

  perform set_config('request.jwt.claim.sub', user_b::text, true);
  perform set_config('request.jwt.claim.session_id', session_b1::text, true);
  select count(*) into rows_seen from public.list_own_active_sessions();
  if rows_seen <> 1 then
    raise exception 'FAIL: user B should see exactly their own 1 session, saw %', rows_seen;
  end if;

  raise notice 'PASS: list_own_active_sessions is scoped to auth.uid() and flags is_current correctly';
end $scoping$;

do $expiry$
declare
  user_c uuid := gen_random_uuid();
  live_session uuid := gen_random_uuid();
  expired_session uuid := gen_random_uuid();
  rows_seen int;
begin
  insert into auth.users (id, email) values (user_c, 'session-c@example.com');
  insert into auth.sessions (id, user_id, created_at, refreshed_at, not_after)
  values
    (live_session, user_c, now(), now(), null),
    (expired_session, user_c, now() - interval '3 days', now() - interval '3 days', now() - interval '1 day');

  perform set_config('request.jwt.claim.sub', user_c::text, true);
  perform set_config('request.jwt.claim.session_id', live_session::text, true);
  select count(*) into rows_seen from public.list_own_active_sessions();
  if rows_seen <> 1 then
    raise exception 'FAIL: expired session should be excluded, saw % rows', rows_seen;
  end if;

  raise notice 'PASS: expired sessions are excluded';
end $expiry$;

do $activity_type$
begin
  if not has_function_privilege('service_role', 'public.log_account_activity_server(text,uuid,text,text,jsonb)', 'EXECUTE') then
    raise exception 'FAIL: service_role cannot execute log_account_activity_server';
  end if;
  if has_function_privilege('authenticated', 'public.log_account_activity_server(text,uuid,text,text,jsonb)', 'EXECUTE') then
    raise exception 'FAIL: authenticated can execute log_account_activity_server directly';
  end if;

  execute 'set local role service_role';
  perform public.log_account_activity_server('concurrent_session_detected', gen_random_uuid(), '203.0.113.5', 'Mozilla/5.0', '{"count": 1}'::jsonb);
  reset role;
  raise notice 'PASS: concurrent_session_detected is an accepted account activity type';
end $activity_type$;

rollback;
