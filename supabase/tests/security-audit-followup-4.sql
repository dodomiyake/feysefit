-- Follow-up 4 assertions. Real Supabase staging or CI. Ends in ROLLBACK.

begin;

do $$
declare
  broken_count integer;
  helper_count integer;
begin
  select count(*)
  into broken_count
  from pg_policies
  where schemaname = 'public'
    and tablename <> 'designer_profiles'
    and roles @> array['authenticated']::name[]
    and position(
      'designer_profiles' in coalesce(qual, '') || coalesce(with_check, '')
    ) > 0
    and position(
      'user_id' in coalesce(qual, '') || coalesce(with_check, '')
    ) > 0;

  if broken_count <> 0 then
    raise exception
      'FAIL: % authenticated policies still query designer_profiles.user_id directly',
      broken_count;
  end if;

  select count(*)
  into helper_count
  from pg_policies
  where schemaname = 'public'
    and policyname in (
      'portfolio_designer_manage',
      'projects_designer_insert',
      'projects_designer_update',
      'testimonial_reports_designer_insert',
      'testimonials_designer_read',
      'testimonials_designer_hide'
    )
    and position(
      'current_designer_profile_id' in
      coalesce(qual, '') || coalesce(with_check, '')
    ) > 0;

  if helper_count <> 6 then
    raise exception
      'FAIL: expected 6 designer policies to use current_designer_profile_id, found %',
      helper_count;
  end if;

  if has_table_privilege(
       'authenticated', 'public.designer_profiles', 'SELECT'
     )
     or has_column_privilege(
       'authenticated', 'public.designer_profiles', 'user_id', 'SELECT'
     )
     or has_column_privilege(
       'authenticated', 'public.designer_profiles', 'phone', 'SELECT'
     )
     or has_column_privilege(
       'authenticated', 'public.designer_profiles', 'admin_notes', 'SELECT'
     ) then
    raise exception
      'FAIL: designer policy fix restored private designer_profiles SELECT access';
  end if;

  raise notice
    'PASS: designer ownership policies use the helper and private grants stay revoked';
end $$;

rollback;
