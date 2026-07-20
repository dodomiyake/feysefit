-- FeyseFit: designer project create must accept any designer profile owned by the user.
-- Fixes "linked client" creates failing when current_designer_profile_id() (LIMIT 1)
-- does not match the profile UUID used on relationships / inserts.
-- Run in Supabase SQL Editor.

begin;

-- Relationship check: active link to ANY designer profile owned by the signed-in user.
create or replace function public.designer_has_active_relationship(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_customer_id is not null
    and auth.uid() is not null
    and exists (
      select 1
      from public.designer_customer_relationships r
      join public.designer_profiles d on d.id = r.designer_id
      where r.customer_id = p_customer_id
        and r.is_active = true
        and d.user_id = auth.uid()
    );
$$;

-- Explicit pair check for insert/update with-check using the row's designer_id.
create or replace function public.designer_owns_active_customer_link(
  p_designer_id uuid,
  p_customer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_designer_id is not null
    and p_customer_id is not null
    and auth.uid() is not null
    and exists (
      select 1
      from public.designer_profiles d
      where d.id = p_designer_id
        and d.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.designer_customer_relationships r
      where r.designer_id = p_designer_id
        and r.customer_id = p_customer_id
        and r.is_active = true
    );
$$;

revoke all on function public.designer_owns_active_customer_link(uuid, uuid) from public;
grant execute on function public.designer_owns_active_customer_link(uuid, uuid) to authenticated;

drop policy if exists "projects_designer_insert" on public.projects;
create policy "projects_designer_insert" on public.projects
for insert
with check (
  public.is_admin()
  or (
    exists (
      select 1
      from public.designer_profiles d
      where d.id = designer_id
        and d.user_id = auth.uid()
    )
    and (
      public.designer_owns_active_customer_link(designer_id, customer_id)
      or public.designer_owns_studio_client(studio_client_id)
      or (customer_id is null and studio_client_id is null)
    )
  )
);

drop policy if exists "projects_designer_update" on public.projects;
create policy "projects_designer_update" on public.projects
for update
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
      where d.id = designer_id
        and d.user_id = auth.uid()
    )
    and (
      public.designer_owns_active_customer_link(designer_id, customer_id)
      or public.designer_owns_studio_client(studio_client_id)
      or (customer_id is null and studio_client_id is null)
    )
  )
);

commit;
