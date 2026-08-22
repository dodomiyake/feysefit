alter table public.projects
  add column if not exists deleted_at timestamptz;

create index if not exists projects_deleted_at_idx
  on public.projects (deleted_at);

create or replace function public.soft_delete_closed_project(p_project_id uuid)
returns uuid
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_project public.projects%rowtype;
  v_actor uuid := auth.uid();
  v_deleted_at timestamptz := clock_timestamp();
begin
  if v_actor is null then
    raise exception 'Sign in again to delete this project.' using errcode = 'P0001';
  end if;

  select *
  into v_project
  from public.projects p
  where p.id = p_project_id
    and p.deleted_at is null
  for update;

  if not found then
    raise exception 'Project not found.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.designer_profiles d
    where d.id = v_project.designer_id
      and d.user_id = v_actor
  ) then
    raise exception 'Only the owning designer can delete this project.' using errcode = 'P0001';
  end if;

  if v_project.status not in ('Completed', 'Cancelled', 'Admin Support') then
    raise exception 'This project is still active. Cancel, complete, or move it to admin support before deleting it.' using errcode = 'P0001';
  end if;

  update public.projects
  set deleted_at = v_deleted_at,
      updated_at = v_deleted_at,
      last_updated = to_char(v_deleted_at, 'FMDD Mon YYYY')
  where id = v_project.id;

  return v_project.id;
end;
$$;

revoke all on function public.soft_delete_closed_project(uuid) from public;
revoke all on function public.soft_delete_closed_project(uuid) from anon;
grant execute on function public.soft_delete_closed_project(uuid) to authenticated;
