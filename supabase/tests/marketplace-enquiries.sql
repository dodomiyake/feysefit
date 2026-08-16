-- Marketplace enquiry authorization assertions. Staging/CI only. Ends in ROLLBACK.

begin;

do $$
declare
  rls_enabled boolean;
  rls_forced boolean;
begin
  select relrowsecurity, relforcerowsecurity
  into rls_enabled, rls_forced
  from pg_class
  where oid = 'public.marketplace_enquiries'::regclass;

  if rls_enabled is distinct from true or rls_forced is distinct from true then
    raise exception 'FAIL: marketplace_enquiries must enable and force RLS';
  end if;
  if has_table_privilege('anon', 'public.marketplace_enquiries', 'SELECT') then
    raise exception 'FAIL: anon can read marketplace enquiries';
  end if;
  if not has_table_privilege('authenticated', 'public.marketplace_enquiries', 'SELECT') then
    raise exception 'FAIL: participants cannot read their RLS-scoped enquiries';
  end if;
  if has_table_privilege('authenticated', 'public.marketplace_enquiries', 'INSERT')
     or has_table_privilege('authenticated', 'public.marketplace_enquiries', 'UPDATE')
     or has_table_privilege('authenticated', 'public.marketplace_enquiries', 'DELETE') then
    raise exception 'FAIL: authenticated can bypass enquiry transition RPCs';
  end if;
  raise notice 'PASS: enquiry table grants are read-only and RLS-gated';
end $$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.create_marketplace_enquiry(uuid,text,text,text,date,text)',
    'public.respond_to_marketplace_enquiry(uuid,text,text)',
    'public.cancel_marketplace_enquiry(uuid)',
    'public.create_project_from_marketplace_enquiry(uuid)'
  ] loop
    if has_function_privilege('anon', fn, 'EXECUTE') then
      raise exception 'FAIL: anon can execute %', fn;
    end if;
    if not has_function_privilege('authenticated', fn, 'EXECUTE') then
      raise exception 'FAIL: authenticated cannot execute %', fn;
    end if;
  end loop;
  raise notice 'PASS: enquiry RPCs are authenticated-only';
end $$;

do $$
declare
  policy_count integer;
begin
  select count(*)::integer into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'marketplace_enquiries'
    and policyname = 'marketplace_enquiries_read_participants'
    and roles @> array['authenticated']::name[]
    and position('current_customer_profile_id' in coalesce(qual, '')) > 0
    and position('current_designer_profile_id' in coalesce(qual, '')) > 0;
  if policy_count <> 1 then
    raise exception 'FAIL: participant SELECT policy is missing or incomplete';
  end if;
end $$;

do $$
begin
  if has_table_privilege('authenticated', 'public.designer_customer_relationships', 'INSERT') then
    raise exception 'FAIL: customers can still insert relationships directly';
  end if;
  if has_table_privilege('authenticated', 'public.designer_customer_relationships', 'UPDATE')
     or has_column_privilege(
       'authenticated', 'public.designer_customer_relationships', 'is_active', 'UPDATE'
     ) then
    raise exception 'FAIL: browser roles can still reactivate relationships directly';
  end if;
  if to_regprocedure('public.link_customer_to_marketplace_designer(uuid)') is not null
     and has_function_privilege(
       'authenticated', 'public.link_customer_to_marketplace_designer(uuid)', 'EXECUTE'
     ) then
    raise exception 'FAIL: legacy immediate-link RPC remains executable';
  end if;
  raise notice 'PASS: acceptance/invite is the relationship creation boundary';
end $$;

do $$
declare
  response_fn text;
  project_fn text;
  unlink_fn text;
begin
  response_fn := pg_get_functiondef(
    'public.respond_to_marketplace_enquiry(uuid,text,text)'::regprocedure
  );
  project_fn := pg_get_functiondef(
    'public.create_project_from_marketplace_enquiry(uuid)'::regprocedure
  );
  unlink_fn := pg_get_functiondef('public.approve_customer_unlink(uuid)'::regprocedure);

  if position('on conflict (designer_id, customer_id)' in lower(response_fn)) = 0 then
    raise exception 'FAIL: acceptance does not activate only the selected pair';
  end if;
  if position('for update' in lower(project_fn)) = 0
     or position('v_enquiry.project_id is not null' in lower(project_fn)) = 0
     or position('active relationship required' in lower(project_fn)) = 0 then
    raise exception 'FAIL: enquiry project creation is not atomic and pair-scoped';
  end if;
  if position('designer_id = v_designer_id' in lower(unlink_fn)) = 0 then
    raise exception 'FAIL: unlink approval is not designer-pair scoped';
  end if;
  raise notice 'PASS: relationship activation and unlinking are pair-scoped';
end $$;

rollback;
