-- ROLLBACK for patch-testimonial-view-lockdown.sql
-- Restores the pre-hardening view definitions from patch-rls-anti-poaching.sql.
-- Does not restore write grants.

begin;

drop view if exists public.marketplace_testimonials;
create view public.marketplace_testimonials
with (security_invoker = false) as
select
  t.id,
  t.legacy_id,
  t.designer_id,
  t.rating,
  t.body,
  t.outfit_type,
  t.photo_url,
  t.allow_public,
  t.show_name,
  t.show_location,
  t.display_name,
  t.display_location,
  t.status,
  t.created_at,
  t.updated_at
from public.testimonials t
where t.allow_public = true
  and t.status = 'active'::public.testimonial_status;

drop view if exists public.testimonials_for_participants;
create view public.testimonials_for_participants
with (security_invoker = false) as
select t.*
from public.testimonials t
where public.is_admin()
   or exists (
     select 1 from public.customer_profiles cp
     where cp.id = t.customer_id and cp.user_id = auth.uid()
   )
   or exists (
     select 1 from public.designer_profiles dp
     where dp.id = t.designer_id and dp.user_id = auth.uid()
   );

grant select on public.marketplace_testimonials to anon, authenticated;
grant select on public.testimonials_for_participants to authenticated;

commit;
