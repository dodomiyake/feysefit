-- Follow-up 3 assertions. Real Supabase staging or CI. Ends in ROLLBACK.

begin;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.current_customer_profile_id()',
    'public.current_designer_profile_id()',
    'public.current_user_role()',
    'public.is_admin()'
  ]
  loop
    if has_function_privilege('anon', fn, 'EXECUTE') then
      raise exception 'FAIL: anon can execute %', fn;
    end if;
    if not has_function_privilege('authenticated', fn, 'EXECUTE') then
      raise exception 'FAIL: authenticated cannot execute required helper %', fn;
    end if;
  end loop;
  raise notice 'PASS: identity/admin helpers are authenticated-only';
end $$;

do $$
declare
  exposed_count integer;
begin
  select count(*)
  into exposed_count
  from pg_policies
  where schemaname = 'public'
    and roles @> array['public']::name[]
    and (
      position('current_customer_profile_id' in coalesce(qual, '') || coalesce(with_check, '')) > 0
      or position('current_designer_profile_id' in coalesce(qual, '') || coalesce(with_check, '')) > 0
      or position('current_user_role' in coalesce(qual, '') || coalesce(with_check, '')) > 0
      or position('is_admin()' in coalesce(qual, '') || coalesce(with_check, '')) > 0
    );

  if exposed_count <> 0 then
    raise exception 'FAIL: % public policies still require authenticated helpers', exposed_count;
  end if;
  raise notice 'PASS: public policies do not call authenticated helpers';
end $$;

set local role anon;
select id, business_name from public.marketplace_designers limit 1;
select id, designer_id from public.marketplace_testimonials limit 1;
reset role;

do $$
begin
  if exists (
    select 1
    from information_schema.views
    where table_schema = 'public'
      and table_name in ('marketplace_designers', 'marketplace_testimonials')
      and (is_updatable <> 'NO' or is_insertable_into <> 'NO')
  ) then
    raise exception 'FAIL: a public marketplace view is writable';
  end if;
  raise notice 'PASS: signed-out marketplace reads work and public views are read-only';
end $$;

rollback;
