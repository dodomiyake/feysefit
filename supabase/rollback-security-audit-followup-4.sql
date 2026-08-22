-- Roll back follow-up 4 policy routing.
-- This restores the earlier policy definitions but does not restore any private
-- designer_profiles SELECT grants.

begin;

drop policy if exists portfolio_designer_manage on public.portfolio_images;
create policy portfolio_designer_manage
on public.portfolio_images
for all
to authenticated
using (
  exists (
    select 1
    from public.designer_profiles d
    where d.id = portfolio_images.designer_id
      and d.user_id = auth.uid()
  )
  or public.is_admin()
);

drop policy if exists projects_designer_insert on public.projects;
create policy projects_designer_insert
on public.projects
for insert
to authenticated
with check (
  public.is_admin()
  or (
    exists (
      select 1
      from public.designer_profiles d
      where d.id = projects.designer_id
        and d.user_id = auth.uid()
    )
    and (
      public.designer_owns_active_customer_link(designer_id, customer_id)
      or public.designer_owns_studio_client(studio_client_id)
      or (customer_id is null and studio_client_id is null)
    )
  )
);

drop policy if exists projects_designer_update on public.projects;
create policy projects_designer_update
on public.projects
for update
to authenticated
using (
  public.is_admin()
  or public.designer_authorized_for_project(id)
)
with check (
  public.is_admin()
  or (
    exists (
      select 1
      from public.designer_profiles d
      where d.id = projects.designer_id
        and d.user_id = auth.uid()
    )
    and (
      public.designer_owns_active_customer_link(designer_id, customer_id)
      or public.designer_owns_studio_client(studio_client_id)
      or (customer_id is null and studio_client_id is null)
    )
  )
);

drop policy if exists testimonial_reports_designer_insert
  on public.testimonial_reports;
create policy testimonial_reports_designer_insert
on public.testimonial_reports
for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and exists (
    select 1
    from public.testimonials t
    join public.designer_profiles dp on dp.id = t.designer_id
    where t.id = testimonial_reports.testimonial_id
      and dp.user_id = auth.uid()
  )
);

drop policy if exists testimonials_designer_read on public.testimonials;
create policy testimonials_designer_read
on public.testimonials
for select
to authenticated
using (
  exists (
    select 1
    from public.designer_profiles dp
    where dp.id = testimonials.designer_id
      and dp.user_id = auth.uid()
  )
);

drop policy if exists testimonials_designer_hide on public.testimonials;
create policy testimonials_designer_hide
on public.testimonials
for update
to authenticated
using (
  exists (
    select 1
    from public.designer_profiles dp
    where dp.id = testimonials.designer_id
      and dp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.designer_profiles dp
    where dp.id = testimonials.designer_id
      and dp.user_id = auth.uid()
  )
);

commit;
