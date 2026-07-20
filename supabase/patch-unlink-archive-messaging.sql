-- FeyseFit: archive conversations on unlink, block unlink with active projects,
-- and preserve read-only message history for accountability.
-- Run after patch-approve-unlink-clear-link.sql and patch-designer-authorized-relationship.sql.
--
-- IMPORTANT: Run patch-project-status-unlink-terminal.sql FIRST (separate query).
-- PostgreSQL cannot use new enum values in the same transaction they are added.

begin;

alter table public.projects
  add column if not exists relationship_archived_at timestamptz;

create index if not exists projects_relationship_archived_idx
  on public.projects (customer_id, designer_id, relationship_archived_at);

-- ---------------------------------------------------------------------------
-- 1) Helpers
-- ---------------------------------------------------------------------------
create or replace function public.project_status_blocks_unlink(p_status public.project_status)
returns boolean
language sql
immutable
as $$
  select p_status::text not in ('Completed', 'Cancelled', 'Admin Support');
$$;

create or replace function public.is_messaging_shell_project(
  p_title text,
  p_outfit_type text,
  p_status public.project_status
)
returns boolean
language sql
immutable
as $$
  select
    coalesce(p_outfit_type, '') = 'General'
    and coalesce(p_title, '') ilike '%— Messages%'
    and p_status = 'Enquiry';
$$;

create or replace function public.designer_has_archived_project_access(p_project_id uuid)
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
      and p.relationship_archived_at is not null
      and p.customer_id is not null
  );
$$;

revoke all on function public.designer_has_archived_project_access(uuid) from public;
grant execute on function public.designer_has_archived_project_access(uuid) to authenticated;

create or replace function public.project_messaging_allowed(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      join public.designer_customer_relationships r
        on r.customer_id = p.customer_id
       and r.designer_id = p.designer_id
       and r.is_active = true
      where p.id = p_project_id
        and p.relationship_archived_at is null
        and (
          p.customer_id = public.current_customer_profile_id()
          or p.designer_id = public.current_designer_profile_id()
        )
    );
$$;

revoke all on function public.project_messaging_allowed(uuid) from public;
grant execute on function public.project_messaging_allowed(uuid) to authenticated;

create or replace function public.designer_can_read_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.designer_authorized_for_project(p_project_id)
    or public.designer_has_archived_project_access(p_project_id);
$$;

revoke all on function public.designer_can_read_project(uuid) from public;
grant execute on function public.designer_can_read_project(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Admin approve: block active projects, archive threads, deactivate link
-- ---------------------------------------------------------------------------
create or replace function public.approve_customer_unlink(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_designer_id uuid;
  v_blocking_count integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can approve unlink requests';
  end if;

  select customer_id, designer_id
  into v_customer_id, v_designer_id
  from public.unlink_requests
  where id = p_request_id;

  if v_customer_id is null or v_designer_id is null then
    raise exception 'Unlink request not found';
  end if;

  select count(*)::integer
  into v_blocking_count
  from public.projects p
  where p.customer_id = v_customer_id
    and p.designer_id = v_designer_id
    and public.project_status_blocks_unlink(p.status)
    and not public.is_messaging_shell_project(p.title, p.outfit_type, p.status);

  if v_blocking_count > 0 then
    raise exception
      'Cannot approve unlink while % active project(s) remain. Complete, cancel, or escalate them to Admin Support first.',
      v_blocking_count;
  end if;

  update public.unlink_requests
  set status = 'approved'
  where id = p_request_id;

  update public.unlink_requests
  set
    status = 'declined',
    admin_notes = coalesce(admin_notes, 'Closed as duplicate of the approved unlink request.'),
    designer_response = coalesce(designer_response, 'Superseded by approved unlink request.'),
    designer_responded_at = coalesce(designer_responded_at, now())
  where customer_id = v_customer_id
    and id <> p_request_id
    and status in ('pending', 'designer_review');

  update public.customer_profiles
  set
    unlink_status = 'approved',
    unlink_reason = null,
    unlink_submitted_at = null,
    active_unlink_request_id = p_request_id
  where id = v_customer_id;

  update public.projects
  set relationship_archived_at = coalesce(relationship_archived_at, now())
  where customer_id = v_customer_id
    and designer_id = v_designer_id;

  update public.designer_customer_relationships
  set is_active = false
  where customer_id = v_customer_id
    and is_active = true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Projects — designer read access to archived commissions
-- ---------------------------------------------------------------------------
drop policy if exists "projects_read_participants" on public.projects;
create policy "projects_read_participants" on public.projects for select using (
  public.is_admin()
  or customer_id = public.current_customer_profile_id()
  or public.designer_can_read_project(id)
);

-- ---------------------------------------------------------------------------
-- 5) Messages — read archived history, block new sends after unlink
-- ---------------------------------------------------------------------------
drop policy if exists "messages_read_project_participants" on public.messages;
create policy "messages_read_project_participants" on public.messages for select using (
  public.is_admin()
  or exists (
    select 1 from public.projects p
    where p.id = messages.project_id
      and p.customer_id = public.current_customer_profile_id()
  )
  or public.designer_can_read_project(messages.project_id)
);

drop policy if exists "messages_insert_participants" on public.messages;
create policy "messages_insert_participants" on public.messages for insert with check (
  public.project_messaging_allowed(project_id)
);

-- ---------------------------------------------------------------------------
-- 6) References & images — historical read, no new uploads when archived
-- ---------------------------------------------------------------------------
drop policy if exists "references_read_project_participants" on public.customer_references;
create policy "references_read_project_participants" on public.customer_references for select using (
  public.is_admin()
  or exists (
    select 1 from public.projects p
    where p.id = customer_references.project_id
      and p.customer_id = public.current_customer_profile_id()
  )
  or public.designer_can_read_project(customer_references.project_id)
);

drop policy if exists "references_manage_customer" on public.customer_references;
create policy "references_manage_customer" on public.customer_references
for all
using (
  public.is_admin()
  or exists (
    select 1 from public.projects p
    where p.id = customer_references.project_id
      and p.customer_id = public.current_customer_profile_id()
  )
  or public.designer_can_read_project(customer_references.project_id)
)
with check (
  public.is_admin()
  or public.project_messaging_allowed(project_id)
);

drop policy if exists "project_images_read_participants" on public.project_images;
create policy "project_images_read_participants" on public.project_images for select using (
  public.is_admin()
  or exists (
    select 1 from public.projects p
    where p.id = project_images.project_id
      and p.customer_id = public.current_customer_profile_id()
  )
  or public.designer_can_read_project(project_images.project_id)
);

drop policy if exists "project_images_insert_participants" on public.project_images;
create policy "project_images_insert_participants" on public.project_images
for insert
with check (
  public.is_admin()
  or (
    uploaded_by = auth.uid()
    and public.project_messaging_allowed(project_id)
  )
);

-- ---------------------------------------------------------------------------
-- 7) Private storage — historical attachments remain readable
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
            public.designer_can_read_project(p.id)
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
            public.designer_can_read_project(p.id)
            or cp.user_id = auth.uid()
          )
      )
    );
$$;

commit;
