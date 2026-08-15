-- Security audit follow-up 3
-- Separate public marketplace reads from authenticated helper-dependent RLS.
-- This removes anonymous EXECUTE on identity/admin helper functions without
-- breaking the signed-out marketplace.

begin;

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and roles @> array['public']::name[]
      and (
        position('current_customer_profile_id' in coalesce(qual, '') || coalesce(with_check, '')) > 0
        or position('current_designer_profile_id' in coalesce(qual, '') || coalesce(with_check, '')) > 0
        or position('current_user_role' in coalesce(qual, '') || coalesce(with_check, '')) > 0
        or position('is_admin()' in coalesce(qual, '') || coalesce(with_check, '')) > 0
      )
      and not (
        tablename = 'designer_profiles'
        and policyname = 'designer_profiles_public_read_live'
      )
      and not (
        tablename = 'portfolio_images'
        and policyname = 'portfolio_public_read'
      )
  loop
    execute format(
      'alter policy %I on %I.%I to authenticated',
      p.policyname,
      p.schemaname,
      p.tablename
    );
  end loop;
end $$;

drop policy if exists designer_profiles_public_read_live
  on public.designer_profiles;
create policy designer_profiles_public_read_live
on public.designer_profiles
for select
to anon, authenticated
using (
  marketplace_live = true
  and exists (
    select 1
    from public.marketplace_listings ml
    where ml.designer_id = designer_profiles.id
      and ml.status = 'approved'
  )
);

drop policy if exists designer_profiles_authenticated_read
  on public.designer_profiles;
create policy designer_profiles_authenticated_read
on public.designer_profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.designer_customer_relationships r
    join public.customer_profiles c on c.id = r.customer_id
    where r.designer_id = designer_profiles.id
      and c.user_id = auth.uid()
      and r.is_active
  )
);

drop policy if exists portfolio_public_read on public.portfolio_images;
create policy portfolio_public_read
on public.portfolio_images
for select
to anon, authenticated
using (
  is_public
  and exists (
    select 1
    from public.designer_profiles d
    where d.id = portfolio_images.designer_id
      and d.marketplace_live = true
      and exists (
        select 1
        from public.marketplace_listings ml
        where ml.designer_id = d.id
          and ml.status = 'approved'
      )
  )
);

revoke execute on function public.current_customer_profile_id() from anon;
revoke execute on function public.current_designer_profile_id() from anon;
revoke execute on function public.current_user_role() from anon;
revoke execute on function public.is_admin() from anon;

commit;
