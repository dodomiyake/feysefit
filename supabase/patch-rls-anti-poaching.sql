-- FeyseFit RLS anti-poaching + marketplace hardening
-- Run in Supabase SQL Editor after schema.sql / prior patches.
-- Closes: open relationship inserts, public storage over-read, testimonial leaks,
-- marketplace self-approve, measurement overshare, invite profile leak.

begin;

-- ---------------------------------------------------------------------------
-- 1) Relationships: designers cannot INSERT arbitrary customer links
-- ---------------------------------------------------------------------------
drop policy if exists "relationships_manage_designer" on public.designer_customer_relationships;
drop policy if exists "relationships_designer_update" on public.designer_customer_relationships;
drop policy if exists "relationships_designer_delete" on public.designer_customer_relationships;
drop policy if exists "relationships_admin_all" on public.designer_customer_relationships;

-- Admin full access
create policy "relationships_admin_all" on public.designer_customer_relationships
for all
using (public.is_admin())
with check (public.is_admin());

-- Designers may update/deactivate existing links only (no insert)
create policy "relationships_designer_update" on public.designer_customer_relationships
for update
using (designer_id = public.current_designer_profile_id())
with check (designer_id = public.current_designer_profile_id());

create policy "relationships_designer_delete" on public.designer_customer_relationships
for delete
using (designer_id = public.current_designer_profile_id());

-- Tighten customer marketplace update: cannot retarget designer_id
drop policy if exists "relationships_customer_marketplace_update" on public.designer_customer_relationships;
create policy "relationships_customer_marketplace_update" on public.designer_customer_relationships
for update
using (customer_id = public.current_customer_profile_id())
with check (
  customer_id = public.current_customer_profile_id()
  and exists (
    select 1
    from public.designer_profiles d
    where d.id = designer_id
      and d.marketplace_live = true
  )
);

-- ---------------------------------------------------------------------------
-- 2) marketplace_live: only admins may set true; designers may opt out (false)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_marketplace_live_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.marketplace_live = true and not public.is_admin() then
      raise exception 'Only admins can enable marketplace visibility';
    end if;
    return new;
  end if;

  if new.marketplace_live is distinct from old.marketplace_live then
    if new.marketplace_live = true and not public.is_admin() then
      raise exception 'Only admins can enable marketplace visibility';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_marketplace_live on public.designer_profiles;
create trigger trg_enforce_marketplace_live
  before insert or update on public.designer_profiles
  for each row
  execute function public.enforce_marketplace_live_change();

-- ---------------------------------------------------------------------------
-- 3) has_concluded_project: customers cannot self-flip; use SECURITY DEFINER RPC
-- ---------------------------------------------------------------------------
create or replace function public.enforce_customer_concluded_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.has_concluded_project is distinct from old.has_concluded_project
     and not public.is_admin() then
    -- Allow only when this change originated from mark_customer_project_concluded
    if coalesce(current_setting('feysefit.allow_concluded_update', true), '') <> 'on' then
      raise exception 'has_concluded_project can only be set by project completion flows';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_customer_concluded on public.customer_profiles;
create trigger trg_enforce_customer_concluded
  before update on public.customer_profiles
  for each row
  execute function public.enforce_customer_concluded_guard();

create or replace function public.mark_customer_project_concluded(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  designer_id uuid := public.current_designer_profile_id();
begin
  if public.is_admin() then
    perform set_config('feysefit.allow_concluded_update', 'on', true);
    update public.customer_profiles
    set has_concluded_project = true,
        updated_at = now()
    where id = p_customer_id;
    return;
  end if;

  if designer_id is null then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1
    from public.projects p
    where p.customer_id = p_customer_id
      and p.designer_id = designer_id
      and p.status = 'Completed'::public.project_status
  ) then
    raise exception 'No completed project found for this customer';
  end if;

  perform set_config('feysefit.allow_concluded_update', 'on', true);
  update public.customer_profiles
  set has_concluded_project = true,
      updated_at = now()
  where id = p_customer_id;
end;
$$;

grant execute on function public.mark_customer_project_concluded(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Measurements: designers only for accepted (non-Enquiry) shared projects
-- ---------------------------------------------------------------------------
drop policy if exists "measurements_read_own_or_designer" on public.measurements;
create policy "measurements_read_own_or_designer" on public.measurements for select using (
  public.is_admin()
  or customer_id = public.current_customer_profile_id()
  or exists (
    select 1
    from public.projects p
    where p.customer_id = measurements.customer_id
      and p.designer_id = public.current_designer_profile_id()
      and p.status is distinct from 'Enquiry'::public.project_status
  )
);

-- Designers may write measurements for customers with an accepted shared project
drop policy if exists "measurements_designer_manage_linked" on public.measurements;
create policy "measurements_designer_manage_linked" on public.measurements
for all
using (
  public.is_admin()
  or exists (
    select 1
    from public.projects p
    where p.customer_id = measurements.customer_id
      and p.designer_id = public.current_designer_profile_id()
      and p.status is distinct from 'Enquiry'::public.project_status
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.projects p
    where p.customer_id = measurements.customer_id
      and p.designer_id = public.current_designer_profile_id()
      and p.status is distinct from 'Enquiry'::public.project_status
  )
);

-- ---------------------------------------------------------------------------
-- 5) Marketplace listings: no public pending/admin notes; status admin-only
-- ---------------------------------------------------------------------------
drop policy if exists "marketplace_read_all" on public.marketplace_listings;
drop policy if exists "marketplace_public_read_approved" on public.marketplace_listings;
drop policy if exists "marketplace_participant_read" on public.marketplace_listings;
drop policy if exists "marketplace_admin_update" on public.marketplace_listings;
drop policy if exists "marketplace_designer_update_content" on public.marketplace_listings;

create policy "marketplace_public_read_approved" on public.marketplace_listings
for select using (status = 'approved'::public.marketplace_status);

create policy "marketplace_participant_read" on public.marketplace_listings
for select using (
  public.is_admin()
  or designer_id = public.current_designer_profile_id()
);

create policy "marketplace_admin_update" on public.marketplace_listings
for update
using (public.is_admin())
with check (public.is_admin());

-- Designers may edit their own pending listing content but not status/admin fields
create or replace function public.enforce_marketplace_listing_designer_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.admin_notes is distinct from old.admin_notes
     or new.decline_reason is distinct from old.decline_reason then
    raise exception 'Only admins can change marketplace listing status or admin notes';
  end if;

  if new.designer_id is distinct from old.designer_id then
    raise exception 'Cannot reassign marketplace listing designer';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_marketplace_listing_update on public.marketplace_listings;
create trigger trg_enforce_marketplace_listing_update
  before update on public.marketplace_listings
  for each row
  execute function public.enforce_marketplace_listing_designer_update();

create policy "marketplace_designer_update_content" on public.marketplace_listings
for update
using (designer_id = public.current_designer_profile_id())
with check (designer_id = public.current_designer_profile_id());

-- ---------------------------------------------------------------------------
-- 6) Drop pending-invite full profile read (use lookup_invite_code RPC)
-- ---------------------------------------------------------------------------
drop policy if exists "designer_profiles_read_pending_invite" on public.designer_profiles;

-- ---------------------------------------------------------------------------
-- 7) Project images: track uploader; customers delete only own uploads
-- ---------------------------------------------------------------------------
alter table public.project_images
  add column if not exists uploaded_by uuid references auth.users (id) on delete set null;

drop policy if exists "project_images_manage_participants" on public.project_images;
drop policy if exists "project_images_insert_participants" on public.project_images;
drop policy if exists "project_images_update_participants" on public.project_images;
drop policy if exists "project_images_delete_own_or_designer" on public.project_images;

create policy "project_images_insert_participants" on public.project_images
for insert
with check (
  public.is_admin()
  or (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_images.project_id
        and (
          p.designer_id = public.current_designer_profile_id()
          or p.customer_id = public.current_customer_profile_id()
        )
    )
  )
);

create policy "project_images_update_participants" on public.project_images
for update
using (
  public.is_admin()
  or uploaded_by = auth.uid()
  or exists (
    select 1 from public.projects p
    where p.id = project_images.project_id
      and p.designer_id = public.current_designer_profile_id()
  )
)
with check (
  public.is_admin()
  or uploaded_by = auth.uid()
  or exists (
    select 1 from public.projects p
    where p.id = project_images.project_id
      and p.designer_id = public.current_designer_profile_id()
  )
);

create policy "project_images_delete_own_or_designer" on public.project_images
for delete
using (
  public.is_admin()
  or uploaded_by = auth.uid()
  or exists (
    select 1 from public.projects p
    where p.id = project_images.project_id
      and p.designer_id = public.current_designer_profile_id()
  )
);

-- ---------------------------------------------------------------------------
-- 8) Testimonials: hide private fields from public; designers can only hide
-- ---------------------------------------------------------------------------
create or replace function public.enforce_testimonial_designer_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  -- Customer owner updates (if any future path) go through admin/customer policies;
  -- this trigger only constrains designer role updates.
  if exists (
    select 1 from public.designer_profiles dp
    where dp.id = old.designer_id and dp.user_id = auth.uid()
  ) and not exists (
    select 1 from public.customer_profiles cp
    where cp.id = old.customer_id and cp.user_id = auth.uid()
  ) then
    if new.rating is distinct from old.rating
       or new.body is distinct from old.body
       or new.outfit_type is distinct from old.outfit_type
       or new.photo_url is distinct from old.photo_url
       or new.private_feedback is distinct from old.private_feedback
       or new.display_name is distinct from old.display_name
       or new.display_location is distinct from old.display_location
       or new.allow_public is distinct from old.allow_public
       or new.show_name is distinct from old.show_name
       or new.show_location is distinct from old.show_location
       or new.customer_id is distinct from old.customer_id
       or new.designer_id is distinct from old.designer_id
       or new.project_id is distinct from old.project_id then
      raise exception 'Designers may only hide or unhide testimonials';
    end if;

    if new.status is distinct from old.status
       and new.status not in (
         'active'::public.testimonial_status,
         'hidden_by_designer'::public.testimonial_status
       ) then
      raise exception 'Invalid testimonial status change';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_testimonial_designer_update on public.testimonials;
create trigger trg_enforce_testimonial_designer_update
  before update on public.testimonials
  for each row
  execute function public.enforce_testimonial_designer_update();

-- Public-safe view (no private_feedback / customer_id / project_id)
drop view if exists public.marketplace_testimonials;
create view public.marketplace_testimonials
with (security_invoker = false)
as
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

grant select on public.marketplace_testimonials to anon, authenticated;

-- Participant view includes private feedback for owners only
drop view if exists public.testimonials_for_participants;
create view public.testimonials_for_participants
with (security_invoker = false)
as
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

grant select on public.testimonials_for_participants to authenticated;

-- Stop full-row public SELECT on the base table (use marketplace_testimonials view)
drop policy if exists "testimonials_public_read" on public.testimonials;
revoke select on public.testimonials from anon;

-- ---------------------------------------------------------------------------
-- 9) Storage: private buckets readable only by owner or linked counterparties
-- ---------------------------------------------------------------------------
update storage.buckets
set public = false
where id in (
  'message-attachments',
  'project-references',
  'project-progress',
  'customer-inspiration'
);

update storage.buckets
set public = true
where id in (
  'avatars',
  'designer-portfolios',
  'measurement-guides'
);

create or replace function public.can_read_private_storage_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with parts as (
    select
      (storage.foldername(object_name))[1] as owner_id,
      (storage.foldername(object_name))[2] as second_segment
  ),
  scoped as (
    select
      owner_id,
      case
        when second_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then second_segment::uuid
        else null
      end as project_id
    from parts
  )
  select
    auth.uid() is not null
    and (
      exists (
        select 1 from scoped s where s.owner_id = auth.uid()::text
      )
      or public.is_admin()
      or exists (
        select 1
        from scoped s
        join public.projects p on p.id = s.project_id
        join public.customer_profiles cp on cp.id = p.customer_id
        join public.designer_profiles dp on dp.id = p.designer_id
        where s.project_id is not null
          and (dp.user_id = auth.uid() or cp.user_id = auth.uid())
      )
      or exists (
        select 1
        from scoped s
        join public.projects p on true
        join public.customer_profiles cp on cp.id = p.customer_id
        join public.designer_profiles dp on dp.id = p.designer_id
        where s.project_id is null
          and (
            cp.user_id::text = s.owner_id
            or dp.user_id::text = s.owner_id
          )
          and (dp.user_id = auth.uid() or cp.user_id = auth.uid())
      )
    );
$$;

revoke all on function public.can_read_private_storage_object(text) from public;
grant execute on function public.can_read_private_storage_object(text) to authenticated;

drop policy if exists "storage_public_read" on storage.objects;
drop policy if exists "storage_authenticated_read_private" on storage.objects;

create policy "storage_public_read"
on storage.objects for select
to public
using (
  bucket_id in (
    'avatars',
    'designer-portfolios',
    'measurement-guides'
  )
);

create policy "storage_authenticated_read_private"
on storage.objects for select
to authenticated
using (
  bucket_id in (
    'message-attachments',
    'project-references',
    'project-progress',
    'customer-inspiration'
  )
  and public.can_read_private_storage_object(name)
);

commit;
