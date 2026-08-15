-- FeyseFit: lock down testimonial views
-- Apply AFTER patch-rls-anti-poaching.sql.
-- Do NOT apply to production from this repository.
--
-- marketplace_testimonials remains SECURITY DEFINER because:
--   patch-rls-anti-poaching revoked anon SELECT on public.testimonials.
--   A security_invoker public view would therefore be empty for signed-out visitors.
--   The definer view projects only public-safe columns, filters allow_public + active,
--   uses a fixed search_path via the wrapping function-free subquery, and has no writes.
-- testimonials_for_participants is rebuilt as security_invoker so base-table RLS applies.
--
-- ROLLBACK: supabase/rollback-testimonial-view-lockdown.sql

begin;

drop view if exists public.marketplace_testimonials;
create view public.marketplace_testimonials
with (security_invoker = false) as
select
  public_rows.id,
  public_rows.legacy_id,
  public_rows.designer_id,
  public_rows.rating,
  public_rows.body,
  public_rows.outfit_type,
  public_rows.photo_url,
  public_rows.allow_public,
  public_rows.show_name,
  public_rows.show_location,
  public_rows.display_name,
  public_rows.display_location,
  public_rows.status,
  public_rows.created_at,
  public_rows.updated_at
from (
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
    and t.status = 'active'::public.testimonial_status
) public_rows;

comment on view public.marketplace_testimonials is
  'SECURITY DEFINER public projection: testimonials table is not selectable by anon. Exposes no private_feedback, customer_id, project_id, or moderation columns. Not writable.';

drop view if exists public.testimonials_for_participants;
create view public.testimonials_for_participants
with (security_invoker = true) as
select
  participant_rows.id,
  participant_rows.legacy_id,
  participant_rows.designer_id,
  participant_rows.customer_id,
  participant_rows.project_id,
  participant_rows.rating,
  participant_rows.body,
  participant_rows.private_feedback,
  participant_rows.outfit_type,
  participant_rows.photo_url,
  participant_rows.allow_public,
  participant_rows.show_name,
  participant_rows.show_location,
  participant_rows.display_name,
  participant_rows.display_location,
  participant_rows.status,
  participant_rows.created_at,
  participant_rows.updated_at
from (
  select
    t.id,
    t.legacy_id,
    t.designer_id,
    t.customer_id,
    t.project_id,
    t.rating,
    t.body,
    t.private_feedback,
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
) participant_rows;

comment on view public.testimonials_for_participants is
  'security_invoker participant view. Base-table RLS restricts rows to customer, designer, or admin. Subquery wrapper makes it non-auto-updatable. Writes go to public.testimonials.';

revoke all on table public.marketplace_testimonials from public, anon, authenticated;
revoke all on table public.testimonials_for_participants from public, anon, authenticated;

grant select on table public.marketplace_testimonials to anon, authenticated;
grant select on table public.testimonials_for_participants to authenticated;

do $$
declare
  v record;
begin
  for v in
    select table_name, is_updatable, is_insertable_into
    from information_schema.views
    where table_schema = 'public'
      and table_name in ('marketplace_testimonials', 'testimonials_for_participants')
  loop
    if v.is_updatable <> 'NO' or v.is_insertable_into <> 'NO' then
      raise exception '% is still updatable=% insertable=%',
        v.table_name, v.is_updatable, v.is_insertable_into;
    end if;
  end loop;
end $$;

commit;
