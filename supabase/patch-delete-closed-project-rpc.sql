create or replace function public.delete_closed_project(p_project_key text)
returns uuid
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_project public.projects%rowtype;
  v_actor uuid := auth.uid();
  v_deleted_id uuid;
begin
  if v_actor is null then
    raise exception 'Sign in again to delete this project.' using errcode = 'P0001';
  end if;

  select *
  into v_project
  from public.projects p
  where (p.id::text = p_project_key or p.legacy_id = p_project_key)
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

  delete from public.projects
  where id = v_project.id
  returning id into v_deleted_id;

  return v_deleted_id;
end;
$$;

revoke all on function public.delete_closed_project(text) from public;
revoke all on function public.delete_closed_project(text) from anon;
grant execute on function public.delete_closed_project(text) to authenticated;
