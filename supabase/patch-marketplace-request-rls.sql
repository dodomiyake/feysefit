-- Allow customers to link to marketplace-live designers and create enquiry projects.
-- Run in Supabase SQL Editor after schema.sql.

drop policy if exists "relationships_customer_marketplace_insert" on public.designer_customer_relationships;
drop policy if exists "relationships_customer_marketplace_update" on public.designer_customer_relationships;
drop policy if exists "projects_insert_customer_enquiry" on public.projects;

create policy "relationships_customer_marketplace_insert" on public.designer_customer_relationships
  for insert with check (
    customer_id = public.current_customer_profile_id()
    and registration_type = 'direct'
    and exists (
      select 1
      from public.designer_profiles d
      where d.id = designer_id
        and d.marketplace_live = true
    )
  );

create policy "relationships_customer_marketplace_update" on public.designer_customer_relationships
  for update using (
    customer_id = public.current_customer_profile_id()
  ) with check (
    customer_id = public.current_customer_profile_id()
    and exists (
      select 1
      from public.designer_profiles d
      where d.id = designer_id
        and d.marketplace_live = true
    )
  );

create policy "projects_insert_customer_enquiry" on public.projects
  for insert with check (
    customer_id = public.current_customer_profile_id()
    and status = 'Enquiry'
    and exists (
      select 1
      from public.designer_customer_relationships r
      where r.customer_id = projects.customer_id
        and r.designer_id = projects.designer_id
        and r.is_active = true
    )
  );
