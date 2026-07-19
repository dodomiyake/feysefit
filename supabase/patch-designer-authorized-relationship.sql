-- Require an authorised active designer↔customer relationship for designer
-- access to platform customer data and related project artifacts.
-- Studio walk-in commissions remain designer-owned via studio_clients.
-- Run after patch-rls-anti-poaching.sql.

begin;

-- Ensure project studio link column exists (null when feature unused).
alter table public.projects
  add column if not exists studio_client_id uuid;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.designer_has_active_relationship(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_customer_id is not null
    and public.current_designer_profile_id() is not null
    and exists (
      select 1
      from public.designer_customer_relationships r
      where r.customer_id = p_customer_id
        and r.designer_id = public.current_designer_profile_id()
        and r.is_active = true
    );
$$;

revoke all on function public.designer_has_active_relationship(uuid) from public;
grant execute on function public.designer_has_active_relationship(uuid) to authenticated;

create or replace function public.designer_owns_studio_client(p_studio_client_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_studio_client_id is null or public.current_designer_profile_id() is null then
    return false;
  end if;
  if to_regclass('public.studio_clients') is null then
    return false;
  end if;
  return exists (
    select 1
    from public.studio_clients sc
    where sc.id = p_studio_client_id
      and sc.designer_id = public.current_designer_profile_id()
  );
exception
  when undefined_table then
    return false;
end;
$$;

revoke all on function public.designer_owns_studio_client(uuid) from public;
grant execute on function public.designer_owns_studio_client(uuid) to authenticated;

-- Designer may access a project only when they own it AND:
--   • active relationship to the platform customer, or
--   • ownership of the studio walk-in client, or
--   • legacy rows with neither customer_id nor studio_client_id
create or replace function public.designer_authorized_for_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.designer_id = public.current_designer_profile_id()
      and (
        public.designer_has_active_relationship(p.customer_id)
        or public.designer_owns_studio_client(p.studio_client_id)
        or (p.customer_id is null and p.studio_client_id is null)
      )
  );
$$;

revoke all on function public.designer_authorized_for_project(uuid) from public;
grant execute on function public.designer_authorized_for_project(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
drop policy if exists "projects_read_participants" on public.projects;
create policy "projects_read_participants" on public.projects for select using (
  public.is_admin()
  or customer_id = public.current_customer_profile_id()
  or public.designer_authorized_for_project(id)
);

drop policy if exists "projects_manage_designer" on public.projects;
drop policy if exists "projects_designer_insert" on public.projects;
drop policy if exists "projects_designer_update" on public.projects;
drop policy if exists "projects_designer_delete" on public.projects;

create policy "projects_designer_insert" on public.projects
for insert
with check (
  public.is_admin()
  or (
    designer_id = public.current_designer_profile_id()
    and (
      public.designer_has_active_relationship(customer_id)
      or public.designer_owns_studio_client(studio_client_id)
      or (customer_id is null and studio_client_id is null)
    )
  )
);

create policy "projects_designer_update" on public.projects
for update
using (
  public.is_admin()
  or public.designer_authorized_for_project(id)
)
with check (
  public.is_admin()
  or (
    designer_id = public.current_designer_profile_id()
    and (
      public.designer_has_active_relationship(customer_id)
      or public.designer_owns_studio_client(studio_client_id)
      or (customer_id is null and studio_client_id is null)
    )
  )
);

create policy "projects_designer_delete" on public.projects
for delete
using (
  public.is_admin()
  or public.designer_authorized_for_project(id)
);

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------
drop policy if exists "messages_read_project_participants" on public.messages;
create policy "messages_read_project_participants" on public.messages for select using (
  public.is_admin()
  or exists (
    select 1 from public.projects p
    where p.id = messages.project_id
      and p.customer_id = public.current_customer_profile_id()
  )
  or public.designer_authorized_for_project(messages.project_id)
);

drop policy if exists "messages_insert_participants" on public.messages;
create policy "messages_insert_participants" on public.messages for insert with check (
  public.is_admin()
  or exists (
    select 1 from public.projects p
    where p.id = messages.project_id
      and p.customer_id = public.current_customer_profile_id()
  )
  or public.designer_authorized_for_project(messages.project_id)
);

-- ---------------------------------------------------------------------------
-- Customer references
-- ---------------------------------------------------------------------------
drop policy if exists "references_read_project_participants" on public.customer_references;
create policy "references_read_project_participants" on public.customer_references for select using (
  public.is_admin()
  or exists (
    select 1 from public.projects p
    where p.id = customer_references.project_id
      and p.customer_id = public.current_customer_profile_id()
  )
  or public.designer_authorized_for_project(customer_references.project_id)
);

-- ---------------------------------------------------------------------------
-- Measurements — active relationship required for designers
-- ---------------------------------------------------------------------------
drop policy if exists "measurements_read_own_or_designer" on public.measurements;
create policy "measurements_read_own_or_designer" on public.measurements for select using (
  public.is_admin()
  or customer_id = public.current_customer_profile_id()
  or public.designer_has_active_relationship(customer_id)
);

drop policy if exists "measurements_designer_manage_linked" on public.measurements;
create policy "measurements_designer_manage_linked" on public.measurements
for all
using (
  public.is_admin()
  or public.designer_has_active_relationship(customer_id)
)
with check (
  public.is_admin()
  or public.designer_has_active_relationship(customer_id)
);

-- ---------------------------------------------------------------------------
-- Project images
-- ---------------------------------------------------------------------------
drop policy if exists "project_images_read_participants" on public.project_images;
create policy "project_images_read_participants" on public.project_images for select using (
  public.is_admin()
  or exists (
    select 1 from public.projects p
    where p.id = project_images.project_id
      and p.customer_id = public.current_customer_profile_id()
  )
  or public.designer_authorized_for_project(project_images.project_id)
);

drop policy if exists "project_images_insert_participants" on public.project_images;
create policy "project_images_insert_participants" on public.project_images
for insert
with check (
  public.is_admin()
  or (
    uploaded_by = auth.uid()
    and (
      exists (
        select 1 from public.projects p
        where p.id = project_images.project_id
          and p.customer_id = public.current_customer_profile_id()
      )
      or public.designer_authorized_for_project(project_images.project_id)
    )
  )
);

drop policy if exists "project_images_update_participants" on public.project_images;
create policy "project_images_update_participants" on public.project_images
for update
using (
  public.is_admin()
  or uploaded_by = auth.uid()
  or public.designer_authorized_for_project(project_images.project_id)
)
with check (
  public.is_admin()
  or uploaded_by = auth.uid()
  or public.designer_authorized_for_project(project_images.project_id)
);

drop policy if exists "project_images_delete_own_or_designer" on public.project_images;
create policy "project_images_delete_own_or_designer" on public.project_images
for delete
using (
  public.is_admin()
  or uploaded_by = auth.uid()
  or public.designer_authorized_for_project(project_images.project_id)
);

-- ---------------------------------------------------------------------------
-- Delivery issues — designer must still be actively linked to the customer
-- ---------------------------------------------------------------------------
drop policy if exists "delivery_issues_designer_read" on public.project_delivery_issues;
create policy "delivery_issues_designer_read" on public.project_delivery_issues
for select using (
  public.is_admin()
  or (
    designer_id = public.current_designer_profile_id()
    and public.designer_has_active_relationship(customer_id)
  )
);

drop policy if exists "delivery_issues_designer_update" on public.project_delivery_issues;
create policy "delivery_issues_designer_update" on public.project_delivery_issues
for update
using (
  public.is_admin()
  or (
    designer_id = public.current_designer_profile_id()
    and public.designer_has_active_relationship(customer_id)
  )
)
with check (
  public.is_admin()
  or (
    designer_id = public.current_designer_profile_id()
    and public.designer_has_active_relationship(customer_id)
  )
);

-- ---------------------------------------------------------------------------
-- Customer profiles — keep active-relationship gate (reaffirm)
-- ---------------------------------------------------------------------------
drop policy if exists "customer_profiles_read_linked_or_own" on public.customer_profiles;
create policy "customer_profiles_read_linked_or_own" on public.customer_profiles for select using (
  user_id = auth.uid()
  or public.is_admin()
  or public.designer_has_active_relationship(id)
);

-- ---------------------------------------------------------------------------
-- Storage helper: private objects only when linked / shared via auth relationship
-- (replaces project-only fallback used in anti-poaching patch for designers)
-- ---------------------------------------------------------------------------
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
        where s.project_id is not null
          and (
            public.designer_authorized_for_project(p.id)
            or cp.user_id = auth.uid()
          )
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
          and (
            public.designer_authorized_for_project(p.id)
            or cp.user_id = auth.uid()
          )
      )
    );
$$;

commit;
