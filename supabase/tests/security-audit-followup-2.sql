-- Follow-up 2 assertions. Staging SQL editor or CI. Ends in ROLLBACK.
-- Never print PII. Requires patch-security-audit-followup.sql then
-- patch-security-audit-followup-2.sql.

begin;

-- Real Supabase enforces public.users -> auth.users. Create disposable auth
-- identities without firing the signup trigger; the enclosing transaction rolls
-- back every fixture.
set local session_replication_role = replica;
insert into auth.users (id, email, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', 'd@example.test', '{}'::jsonb, now(), now()),
  ('22222222-2222-4222-8222-222222222222', 'a@example.test', '{}'::jsonb, now(), now()),
  ('33333333-3333-4333-8333-333333333333', 'b@example.test', '{}'::jsonb, now(), now())
on conflict (id) do nothing;
set local session_replication_role = origin;

do $$
begin
  if has_function_privilege('anon', 'public.log_account_activity(text,text,text,text,jsonb)', 'EXECUTE') then
    raise exception 'FAIL: anon can execute log_account_activity';
  end if;
  if has_function_privilege('authenticated', 'public.log_account_activity(text,text,text,text,jsonb)', 'EXECUTE') then
    raise exception 'FAIL: authenticated can execute log_account_activity';
  end if;
  if to_regprocedure('public.log_account_activity_server(text,uuid,text,text,jsonb)') is null then
    raise exception 'FAIL: log_account_activity_server missing';
  end if;
  if has_function_privilege('anon', 'public.log_account_activity_server(text,uuid,text,text,jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.log_account_activity_server(text,uuid,text,text,jsonb)', 'EXECUTE') then
    raise exception 'FAIL: browser roles can execute log_account_activity_server';
  end if;
  raise notice 'PASS: account activity RPC is service-role only';
end $$;

do $$
begin
  begin
    execute 'set local role anon';
    perform public.log_account_activity('login_succeeded', 'a@b.c', '1.1.1.1', 'ua', '{}'::jsonb);
    raise exception 'FAIL: anon log_account_activity succeeded';
  exception
    when insufficient_privilege then
      raise notice 'PASS: anon log_account_activity denied';
    when others then
      if sqlerrm ilike '%not authorized%' or sqlerrm ilike '%permission%' or sqlerrm ilike '%denied%' then
        raise notice 'PASS: anon log_account_activity blocked (%)', sqlstate;
      else
        raise exception 'FAIL: anon log_account_activity unexpected % %', sqlstate, sqlerrm;
      end if;
  end;
  reset role;
end $$;

do $$
begin
  begin
    execute 'set local role authenticated';
    perform public.consume_rate_limit_server('auth_abuse', repeat('ab', 16));
    raise exception 'FAIL: authenticated consume_rate_limit_server succeeded';
  exception
    when insufficient_privilege then
      raise notice 'PASS: authenticated consume_rate_limit_server denied';
    when undefined_function then
      raise exception 'FAIL: consume_rate_limit_server missing';
    when others then
      if sqlerrm ilike '%permission%' or sqlerrm ilike '%denied%' or sqlerrm ilike '%not authorized%' then
        raise notice 'PASS: authenticated consume_rate_limit_server blocked (%)', sqlstate;
      else
        raise exception 'FAIL: authenticated limiter unexpected % %', sqlstate, sqlerrm;
      end if;
  end;
  reset role;
end $$;

do $$
begin
  if has_schema_privilege('anon', 'app_private', 'USAGE')
     or has_schema_privilege('authenticated', 'app_private', 'USAGE') then
    raise exception 'FAIL: browser roles have USAGE on app_private';
  end if;
  raise notice 'PASS: app_private is not usable by browser roles';
end $$;

-- can_read_private_storage_object is EXECUTE, not SELECT
do $$
begin
  if to_regprocedure('public.can_read_private_storage_object(text)') is not null then
    if not has_function_privilege('authenticated', 'public.can_read_private_storage_object(text)', 'EXECUTE') then
      raise exception 'FAIL: authenticated lacks EXECUTE on can_read_private_storage_object';
    end if;
    raise notice 'PASS: can_read_private_storage_object privilege is EXECUTE';
  end if;
end $$;

-- Cross-project: same designer, two customers. C1 cannot read P2 or unscoped objects.
do $$
declare
  designer_user uuid := '11111111-1111-4111-8111-111111111111';
  customer_a_user uuid := '22222222-2222-4222-8222-222222222222';
  customer_b_user uuid := '33333333-3333-4333-8333-333333333333';
  designer_id uuid;
  customer_a uuid;
  customer_b uuid;
  project_a uuid;
  project_b uuid;
  unscoped text;
  path_a text;
  path_b text;
begin
  insert into public.users (id, email, name, role)
  values
    (designer_user, 'd@example.test', 'Designer', 'designer'),
    (customer_a_user, 'a@example.test', 'Customer A', 'customer'),
    (customer_b_user, 'b@example.test', 'Customer B', 'customer')
  on conflict (id) do nothing;

  insert into public.designer_profiles (user_id, designer_name, business_name)
  values (designer_user, 'Studio', 'Studio')
  returning id into designer_id;
  if designer_id is null then
    select id into designer_id from public.designer_profiles where user_id = designer_user limit 1;
  end if;

  insert into public.customer_profiles (user_id, email, name)
  values (customer_a_user, 'a@example.test', 'Customer A')
  returning id into customer_a;
  if customer_a is null then
    select id into customer_a from public.customer_profiles where user_id = customer_a_user limit 1;
  end if;

  insert into public.customer_profiles (user_id, email, name)
  values (customer_b_user, 'b@example.test', 'Customer B')
  returning id into customer_b;
  if customer_b is null then
    select id into customer_b from public.customer_profiles where user_id = customer_b_user limit 1;
  end if;

  insert into public.projects (project_code, title, customer_name, customer_id, designer_id, outfit_type, deadline, budget, status)
  values ('TEST-A', 'Test A', 'Customer A', customer_a, designer_id, 'Test', current_date, 0, 'In Production')
  returning id into project_a;
  insert into public.projects (project_code, title, customer_name, customer_id, designer_id, outfit_type, deadline, budget, status)
  values ('TEST-B', 'Test B', 'Customer B', customer_b, designer_id, 'Test', current_date, 0, 'In Production')
  returning id into project_b;

  insert into public.designer_customer_relationships (designer_id, customer_id, is_active)
  values (designer_id, customer_a, true), (designer_id, customer_b, true)
  on conflict do nothing;

  unscoped := designer_user::text || '/legacy-file.jpg';
  path_a := designer_user::text || '/' || project_a::text || '/a.jpg';
  path_b := designer_user::text || '/' || project_b::text || '/b.jpg';

  perform set_config('request.jwt.claim.sub', customer_a_user::text, true);
  if public.can_read_private_storage_object(unscoped) then
    raise exception 'FAIL: customer A can read unscoped designer object';
  end if;
  if public.can_read_private_storage_object(path_b) then
    raise exception 'FAIL: customer A can read project B object';
  end if;
  if not public.can_read_private_storage_object(path_a) then
    raise exception 'FAIL: customer A cannot read own project object';
  end if;

  perform set_config('request.jwt.claim.sub', designer_user::text, true);
  if not public.can_read_private_storage_object(unscoped) then
    raise exception 'FAIL: owner cannot read unscoped object';
  end if;
  if not public.can_read_private_storage_object(path_a)
     or not public.can_read_private_storage_object(path_b) then
    raise exception 'FAIL: designer cannot read own project-scoped objects';
  end if;

  perform set_config('request.jwt.claim.sub', customer_b_user::text, true);
  if public.can_read_private_storage_object(path_a) then
    raise exception 'FAIL: customer B can read project A object';
  end if;

  raise notice 'PASS: unscoped and cross-project storage reads';
end $$;

do $
begin
  perform app_private.cleanup_rate_limit_counters();
  if to_regprocedure('app_private.cleanup_quarantine_objects()') is not null then
    raise exception 'FAIL: SQL quarantine cleanup must not exist; use the Storage API';
  end if;
  raise notice 'PASS: database cleanup runs and quarantine cleanup is Storage API only';
end $;

rollback;
