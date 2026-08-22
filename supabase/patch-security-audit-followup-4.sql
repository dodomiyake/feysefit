-- Security audit follow-up 4
-- Keep designer ownership policies usable after designer_profiles.user_id
-- was removed from browser SELECT grants. Use the existing SECURITY DEFINER
-- identity helper instead of querying the private user_id column from another
-- table's RLS policy.

begin;

drop policy if exists portfolio_designer_manage on public.portfolio_images;
create policy portfolio_designer_manage
on public.portfolio_images
for all
to authenticated
using (
  designer_id = public.current_designer_profile_id()
  or public.is_admin()
)
with check (
  designer_id = public.current_designer_profile_id()
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
    designer_id = public.current_designer_profile_id()
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
    designer_id = public.current_designer_profile_id()
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
    where t.id = testimonial_reports.testimonial_id
      and t.designer_id = public.current_designer_profile_id()
  )
);

drop policy if exists testimonials_designer_read on public.testimonials;
create policy testimonials_designer_read
on public.testimonials
for select
to authenticated
using (
  designer_id = public.current_designer_profile_id()
);

drop policy if exists testimonials_designer_hide on public.testimonials;
create policy testimonials_designer_hide
on public.testimonials
for update
to authenticated
using (
  designer_id = public.current_designer_profile_id()
)
with check (
  designer_id = public.current_designer_profile_id()
);

commit;
