-- Allows a customer to end a designer relationship immediately when no active
-- project exists for that customer/designer pair.
--
-- Active projects still block unlinking and must be completed, cancelled, or
-- moved to Admin Support first. The unlink is scoped to one designer so a client
-- with multiple designer relationships is not accidentally disconnected from all.

create or replace function public.self_unlink_customer_designer(
  p_designer_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_customer_id uuid;
  v_request_id uuid;
  v_blocking_count integer;
  v_customer_name text;
  v_designer_name text;
  v_reason text;
  v_submitted_at text;
begin
  if auth.uid() is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  v_customer_id := public.current_customer_profile_id();
  if v_customer_id is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_designer_id is null then
    raise exception 'designer id required';
  end if;

  perform 1
  from public.designer_customer_relationships r
  where r.customer_id = v_customer_id
    and r.designer_id = p_designer_id
    and r.is_active = true
  for update;

  if not found then
    raise exception 'No active relationship found for this designer';
  end if;

  select count(*)::integer into v_blocking_count
  from public.projects p
  where p.customer_id = v_customer_id
    and p.designer_id = p_designer_id
    and public.project_status_blocks_unlink(p.status)
    and not public.is_messaging_shell_project(p.title, p.outfit_type, p.status);

  if v_blocking_count > 0 then
    raise exception 'You have % active project%s with this designer. Complete, cancel, or escalate the project before unlinking.',
      v_blocking_count,
      case when v_blocking_count = 1 then '' else 's' end;
  end if;

  select coalesce(nullif(name, ''), 'Customer') into v_customer_name
  from public.customer_profiles
  where id = v_customer_id;

  select coalesce(nullif(business_name, ''), nullif(designer_name, ''), 'Designer') into v_designer_name
  from public.designer_profiles
  where id = p_designer_id;

  v_reason := coalesce(nullif(trim(p_reason), ''), 'Client ended designer relationship with no active project.');
  v_submitted_at := to_char(current_date, 'DD Mon YYYY');

  insert into public.unlink_requests (
    customer_id,
    customer_name,
    designer_id,
    designer_name,
    reason,
    submitted_at,
    status,
    admin_notes,
    designer_confirmation
  ) values (
    v_customer_id,
    coalesce(v_customer_name, 'Customer'),
    p_designer_id,
    coalesce(v_designer_name, 'Designer'),
    v_reason,
    v_submitted_at,
    'approved',
    'Auto-approved because the client had no active project with this designer.',
    null
  )
  returning id into v_request_id;

  update public.projects
  set relationship_archived_at = coalesce(relationship_archived_at, clock_timestamp())
  where customer_id = v_customer_id
    and designer_id = p_designer_id;

  update public.designer_customer_relationships
  set is_active = false
  where customer_id = v_customer_id
    and designer_id = p_designer_id
    and is_active = true;

  update public.customer_profiles
  set unlink_status = 'approved',
      unlink_reason = null,
      unlink_submitted_at = null,
      active_unlink_request_id = v_request_id
  where id = v_customer_id;

  return v_request_id;
end;
$function$;

revoke all on function public.self_unlink_customer_designer(uuid, text) from public;
grant execute on function public.self_unlink_customer_designer(uuid, text) to authenticated, service_role;

create or replace function public.auto_approve_unlink_without_active_project()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_blocking_count integer;
begin
  if new.status is distinct from 'pending' then
    return new;
  end if;

  select count(*)::integer into v_blocking_count
  from public.projects p
  where p.customer_id = new.customer_id
    and p.designer_id = new.designer_id
    and public.project_status_blocks_unlink(p.status)
    and not public.is_messaging_shell_project(p.title, p.outfit_type, p.status);

  if v_blocking_count > 0 then
    return new;
  end if;

  if exists (
    select 1
    from public.designer_customer_relationships r
    where r.customer_id = new.customer_id
      and r.designer_id = new.designer_id
      and r.is_active = true
  ) then
    new.status := 'approved';
    new.admin_notes := coalesce(
      new.admin_notes,
      'Auto-approved because the client had no active project with this designer.'
    );
    new.designer_confirmation := null;

    update public.projects
    set relationship_archived_at = coalesce(relationship_archived_at, clock_timestamp())
    where customer_id = new.customer_id
      and designer_id = new.designer_id;

    update public.designer_customer_relationships
    set is_active = false
    where customer_id = new.customer_id
      and designer_id = new.designer_id
      and is_active = true;

    update public.customer_profiles
    set unlink_status = 'approved',
        unlink_reason = null,
        unlink_submitted_at = null,
        active_unlink_request_id = new.id
    where id = new.customer_id;
  end if;

  return new;
end;
$function$;

drop trigger if exists auto_approve_unlink_without_active_project on public.unlink_requests;
create trigger auto_approve_unlink_without_active_project
before insert on public.unlink_requests
for each row
execute function public.auto_approve_unlink_without_active_project();

revoke all on function public.auto_approve_unlink_without_active_project() from public;
grant execute on function public.auto_approve_unlink_without_active_project() to service_role;
