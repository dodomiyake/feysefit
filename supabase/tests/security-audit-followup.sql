-- Follow-up security assertions (staging SQL editor or CI).
-- Never print PII. Ends in ROLLBACK.
--
-- Requires: supabase/patch-security-audit-followup.sql applied.

do $$
begin
  if to_regnamespace('app_private') is null then
    raise exception 'app_private schema missing. Apply patch-security-audit-followup.sql first.';
  end if;
end $$;

begin;

-- Anon/authenticated cannot execute the old limiter or the server wrapper.
do $$
begin
  if has_function_privilege('anon', 'public.consume_rate_limit(text,integer,integer)', 'EXECUTE') then
    raise exception 'FAIL: anon can execute public.consume_rate_limit';
  end if;
  if has_function_privilege('authenticated', 'public.consume_rate_limit(text,integer,integer)', 'EXECUTE') then
    raise exception 'FAIL: authenticated can execute public.consume_rate_limit';
  end if;
  if has_function_privilege('anon', 'public.consume_rate_limit_server(text,text)', 'EXECUTE') then
    raise exception 'FAIL: anon can execute consume_rate_limit_server';
  end if;
  if has_function_privilege('authenticated', 'public.consume_rate_limit_server(text,text)', 'EXECUTE') then
    raise exception 'FAIL: authenticated can execute consume_rate_limit_server';
  end if;
  if has_function_privilege('anon', 'public.log_security_event(text,text,text,text,jsonb)', 'EXECUTE') then
    raise exception 'FAIL: anon can execute log_security_event';
  end if;
  if has_function_privilege('anon', 'public.log_account_activity(text,text,text,text,jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.log_account_activity(text,text,text,text,jsonb)', 'EXECUTE') then
    raise exception 'FAIL: browser roles can execute log_account_activity';
  end if;
  if has_function_privilege('anon', 'public.lookup_invite_code(text)', 'EXECUTE') then
    raise exception 'FAIL: anon can execute lookup_invite_code';
  end if;
  raise notice 'PASS: browser roles cannot execute limiter/logging/invite lookup RPCs';
end $$;

-- Direct anon EXECUTE attempt fails.
do $$
begin
  begin
    execute 'set local role anon';
    perform public.consume_rate_limit('abc', 10, 60);
    raise exception 'FAIL: anon consume_rate_limit succeeded';
  exception
    when insufficient_privilege then
      raise notice 'PASS: anon consume_rate_limit denied';
    when others then
      if sqlerrm ilike '%not authorized%' or sqlerrm ilike '%permission%' or sqlerrm ilike '%denied%' then
        raise notice 'PASS: anon consume_rate_limit blocked (%)', sqlstate;
      else
        raise exception 'FAIL: anon consume_rate_limit unexpected % %', sqlstate, sqlerrm;
      end if;
  end;
  reset role;
end $$;

-- Owner/service limiter still allow-then-deny.
do $$
declare
  k text := repeat('ab', 16);
  first_hit boolean;
  second_hit boolean;
  third_hit boolean;
begin
  first_hit := app_private.consume_rate_limit('auth_abuse', k);
  second_hit := app_private.consume_rate_limit('auth_abuse', k);
  -- policy limit is 20; use a tiny operation by exhausting via loop is slow.
  -- Instead insert a dedicated test operation.
  raise notice 'PASS-or-setup: first hits auth_abuse % %', first_hit, second_hit;
end $$;

insert into app_private.rate_limit_policies (operation, hit_limit, window_seconds)
values ('ci_probe', 2, 60)
on conflict (operation) do update set hit_limit = 2, window_seconds = 60;

do $$
declare
  k text := md5(gen_random_uuid()::text);
  a boolean;
  b boolean;
  c boolean;
begin
  a := app_private.consume_rate_limit('ci_probe', k);
  b := app_private.consume_rate_limit('ci_probe', k);
  c := app_private.consume_rate_limit('ci_probe', k);
  if a is distinct from true or b is distinct from true then
    raise exception 'FAIL: app_private.consume_rate_limit did not allow first two hits';
  end if;
  if c is distinct from false then
    raise exception 'FAIL: app_private.consume_rate_limit did not deny the third hit';
  end if;
  if app_private.consume_rate_limit('not_a_real_op', k) is not distinct from true then
    raise exception 'FAIL: unknown operation was allowed';
  end if;
  raise notice 'PASS: private limiter allow then deny';
end $$;

-- Marketplace integrity column grants
do $$
begin
  if to_regclass('public.designer_profiles') is not null then
    if has_column_privilege('authenticated', 'public.designer_profiles', 'rating', 'UPDATE')
       or has_column_privilege('authenticated', 'public.designer_profiles', 'review_count', 'UPDATE')
       or has_column_privilege('authenticated', 'public.designer_profiles', 'marketplace_live', 'UPDATE') then
      raise exception 'FAIL: authenticated can UPDATE marketplace integrity columns';
    end if;
    raise notice 'PASS: authenticated cannot update rating/review_count/marketplace_live';
  end if;
end $$;

-- TRUNCATE/TRIGGER/REFERENCES revoked
do $$
declare
  bad integer;
begin
  select count(*) into bad
  from information_schema.table_privileges
  where table_schema = 'public'
    and grantee in ('PUBLIC', 'anon', 'authenticated')
    and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES');
  if bad <> 0 then
    raise exception 'FAIL: TRUNCATE/TRIGGER/REFERENCES remain for browser roles (%)', bad;
  end if;
  raise notice 'PASS: no TRUNCATE/TRIGGER/REFERENCES for anon/authenticated/PUBLIC';
end $$;

-- Views remain non-updatable
do $$
declare
  v record;
begin
  for v in
    select table_name, is_updatable, is_insertable_into
    from information_schema.views
    where table_schema = 'public'
      and table_name in ('marketplace_testimonials', 'marketplace_designers')
  loop
    if v.is_updatable <> 'NO' or v.is_insertable_into <> 'NO' then
      raise exception 'FAIL: % is writable', v.table_name;
    end if;
  end loop;
  raise notice 'PASS: public marketplace views are not writable';
end $$;

-- marketplace_testimonials is security_invoker
do $$
declare
  invoker boolean;
begin
  select coalesce(reloptions::text ilike '%security_invoker=true%', false)
    into invoker
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'marketplace_testimonials';
  if not invoker then
    raise exception 'FAIL: marketplace_testimonials is not security_invoker';
  end if;
  raise notice 'PASS: marketplace_testimonials security_invoker';
end $$;

-- Anon cannot select private testimonial columns
do $$
begin
  if to_regclass('public.testimonials') is not null then
    if has_column_privilege('anon', 'public.testimonials', 'customer_id', 'SELECT')
       or has_column_privilege('anon', 'public.testimonials', 'project_id', 'SELECT')
       or has_column_privilege('anon', 'public.testimonials', 'private_feedback', 'SELECT') then
      raise exception 'FAIL: anon can select private testimonial columns';
    end if;
    raise notice 'PASS: anon denied private testimonial columns';
  end if;
end $$;

-- rate_limit_counters inaccessible to browser roles
do $$
begin
  if to_regclass('public.rate_limit_counters') is not null then
    if has_table_privilege('anon', 'public.rate_limit_counters', 'SELECT')
       or has_table_privilege('authenticated', 'public.rate_limit_counters', 'SELECT')
       or has_table_privilege('anon', 'public.rate_limit_counters', 'INSERT')
       or has_table_privilege('authenticated', 'public.rate_limit_counters', 'INSERT') then
      raise exception 'FAIL: browser roles can access rate_limit_counters';
    end if;
    raise notice 'PASS: rate_limit_counters is not accessible to browser roles';
  end if;
end $$;

-- Mutable search_path: named advisor functions must be pinned
do $$
declare
  missing integer;
begin
  select count(*) into missing
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'project_status_blocks_unlink',
      'touch_testimonial_updated_at',
      'redact_ip_hint',
      'touch_delivery_issue_updated_at',
      'coarse_device_hint',
      'is_messaging_shell_project',
      'project_is_active_for_customer'
    )
    and (
      p.proconfig is null
      or not exists (
        select 1 from unnest(coalesce(p.proconfig, array[]::text[])) cfg
        where cfg like 'search_path=%'
      )
    );
  if missing <> 0 then
    raise exception 'FAIL: % functions still have mutable search_path', missing;
  end if;
  raise notice 'PASS: advisor-listed functions have search_path';
end $$;

-- RLS forced on project_items when present
do $$
declare
  forced boolean;
begin
  if to_regclass('public.project_items') is not null then
    select c.relforcerowsecurity into forced
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'project_items';
    if forced is not true then
      raise exception 'FAIL: project_items RLS is not forced';
    end if;
    raise notice 'PASS: project_items FORCE RLS';
  end if;
end $$;

rollback;
