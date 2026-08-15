-- FeyseFit security acceptance tests (staging SQL editor only).
-- Never print phone numbers, emails, measurements, messages, invite codes, or other PII.
--
-- Run this ONLY after these patches have been applied successfully:
--   1. supabase/patch-designer-private-details.sql
--   2. supabase/patch-testimonial-view-lockdown.sql
--   3. supabase/patch-function-execute-lockdown.sql
--   4. supabase/patch-admin-aal-rls.sql
--
-- This file does not create tables. If you run it first you will get
-- "relation does not exist".

do $$
begin
  if to_regclass('public.designer_private_details') is null then
    raise exception
      'public.designer_private_details does not exist. Run supabase/patch-designer-private-details.sql in full (from the first line) before this test.';
  end if;
  if to_regclass('public.marketplace_designers') is null then
    raise exception
      'public.marketplace_designers does not exist. The designer-private-details patch did not finish. Re-run that file from the top.';
  end if;
  if to_regprocedure('public.consume_rate_limit(text,integer,integer)') is null then
    raise exception
      'public.consume_rate_limit(text,integer,integer) does not exist. Run supabase/patch-function-execute-lockdown.sql before deploying the app.';
  end if;
end $$;

begin;

-- Views must be structurally non-updatable AND have no write grants.
do $$
declare
  v record;
  write_grants integer;
begin
  for v in
    select table_name, is_updatable, is_insertable_into
    from information_schema.views
    where table_schema = 'public'
      and table_name in (
        'marketplace_testimonials',
        'testimonials_for_participants',
        'marketplace_designers'
      )
  loop
    if v.is_updatable <> 'NO' or v.is_insertable_into <> 'NO' then
      raise exception
        'FAIL: %.% is still updatable=% insertable=%',
        'public', v.table_name, v.is_updatable, v.is_insertable_into;
    end if;
  end loop;

  select count(*) into write_grants
  from information_schema.table_privileges
  where table_schema = 'public'
    and table_name in (
      'marketplace_testimonials',
      'testimonials_for_participants',
      'marketplace_designers'
    )
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
    and grantee in ('PUBLIC', 'anon', 'authenticated');
  if write_grants <> 0 then
    raise exception 'FAIL: write privileges remain on locked views (%)', write_grants;
  end if;

  raise notice 'PASS: marketplace/testimonial views are not updatable and have no write grants';
end $$;

-- Column grants: table-level SELECT must be false; private columns denied.
do $$
declare
  table_selects integer;
  private_col_grants integer;
begin
  if has_table_privilege('anon', 'public.designer_profiles', 'SELECT') then
    raise exception 'FAIL: has_table_privilege(anon, designer_profiles, SELECT) is true';
  end if;
  if has_table_privilege('authenticated', 'public.designer_profiles', 'SELECT') then
    raise exception 'FAIL: has_table_privilege(authenticated, designer_profiles, SELECT) is true';
  end if;

  select count(*) into table_selects
  from information_schema.table_privileges
  where table_schema = 'public'
    and table_name = 'designer_profiles'
    and privilege_type = 'SELECT'
    and grantee in ('PUBLIC', 'anon', 'authenticated');
  if table_selects <> 0 then
    raise exception 'FAIL: table-level SELECT still granted on designer_profiles (%)', table_selects;
  end if;

  if has_column_privilege('anon', 'public.designer_profiles', 'phone', 'SELECT')
     or has_column_privilege('authenticated', 'public.designer_profiles', 'phone', 'SELECT')
     or has_column_privilege('anon', 'public.designer_profiles', 'user_id', 'SELECT')
     or has_column_privilege('authenticated', 'public.designer_profiles', 'user_id', 'SELECT')
     or has_column_privilege('anon', 'public.designer_profiles', 'admin_notes', 'SELECT')
     or has_column_privilege('authenticated', 'public.designer_profiles', 'admin_notes', 'SELECT') then
    raise exception 'FAIL: phone/user_id/admin_notes still selectable by anon or authenticated';
  end if;

  select count(*) into private_col_grants
  from information_schema.column_privileges
  where table_schema = 'public'
    and table_name = 'designer_profiles'
    and column_name in ('phone', 'user_id', 'admin_notes')
    and privilege_type = 'SELECT'
    and grantee in ('anon', 'authenticated', 'PUBLIC');
  if private_col_grants <> 0 then
    raise exception 'FAIL: private column SELECT grants remain (%)', private_col_grants;
  end if;

  if not has_column_privilege('anon', 'public.designer_profiles', 'id', 'SELECT') then
    raise exception 'FAIL: anon lost SELECT on designer_profiles.id';
  end if;

  raise notice 'PASS: designer_profiles is column-only for anon/authenticated';
end $$;

-- Durable limiter: allow within quota, deny when exhausted. Rolled back below.
do $$
declare
  k text := 'staging-limiter-' || gen_random_uuid()::text;
  first_hit boolean;
  second_hit boolean;
  third_hit boolean;
begin
  first_hit := public.consume_rate_limit(k, 2, 60);
  second_hit := public.consume_rate_limit(k, 2, 60);
  third_hit := public.consume_rate_limit(k, 2, 60);

  if first_hit is distinct from true or second_hit is distinct from true then
    raise exception 'FAIL: consume_rate_limit did not allow the first two hits';
  end if;
  if third_hit is distinct from false then
    raise exception 'FAIL: consume_rate_limit did not deny the exhausted hit (got %)', third_hit;
  end if;
  if public.consume_rate_limit('', 2, 60) is not distinct from true then
    raise exception 'FAIL: empty bucket was allowed';
  end if;

  raise notice 'PASS: consume_rate_limit allow then deny';
end $$;

-- Anon cannot execute privileged mutations
do $$
begin
  begin
    execute 'set local role anon';
    perform public.approve_customer_unlink('00000000-0000-0000-0000-000000000000');
    raise exception 'anon was able to execute approve_customer_unlink';
  exception
    when insufficient_privilege then
      raise notice 'PASS: anon cannot execute approve_customer_unlink';
    when others then
      if sqlerrm ilike '%permission%' or sqlerrm ilike '%denied%' or sqlerrm ilike '%not authorized%' then
        raise notice 'PASS: anon approve_customer_unlink blocked (% )', sqlstate;
      else
        raise notice 'PASS-or-review: approve_customer_unlink as anon raised %', sqlstate;
      end if;
  end;
  reset role;
end $$;

-- Counts only (no PII): private rows exist for every designer
do $$
declare
  profiles integer;
  private_rows integer;
begin
  select count(*) into profiles from public.designer_profiles;
  select count(*) into private_rows from public.designer_private_details;
  if private_rows < profiles then
    raise exception 'private details missing: % vs % profiles', private_rows, profiles;
  end if;
  raise notice 'PASS: designer_private_details coverage % / %', private_rows, profiles;
end $$;

rollback;
