-- Customer delivery confirmation & issue reporting (bypasses projects RLS for clients).
-- Run after patch-post-delivery-flow.sql and patch-redelivered-status.sql.

do $$ begin
  alter type public.project_status add value 'Re-delivered';
exception when duplicate_object then null;
end $$;

create or replace function public.confirm_customer_project_delivery(
  project_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_profile_id uuid;
  customer_display_name text;
  project_row public.projects%rowtype;
  last_updated_label text;
  after_redelivery boolean;
begin
  customer_profile_id := public.current_customer_profile_id();
  if customer_profile_id is null then
    raise exception 'Customer profile not found';
  end if;

  select name into customer_display_name
  from public.customer_profiles
  where id = customer_profile_id;

  select * into project_row
  from public.projects
  where (legacy_id = trim(project_key) or id::text = trim(project_key))
    and (
      customer_id = customer_profile_id
      or customer_name = customer_display_name
    )
  limit 1
  for update;

  if not found then
    raise exception 'Project not found';
  end if;

  if project_row.status not in (
    'Awaiting Customer Confirmation'::public.project_status,
    'Delivered'::public.project_status,
    'Re-delivered'::public.project_status
  ) then
    raise exception 'This project is not awaiting your confirmation.';
  end if;

  after_redelivery := project_row.status = 'Re-delivered'::public.project_status;
  last_updated_label := trim(to_char(now(), 'FMDD')) || ' ' || trim(to_char(now(), 'Mon')) || ' ' || trim(to_char(now(), 'YYYY'));

  update public.projects
  set
    status = 'Completed'::public.project_status,
    customer_update = case
      when after_redelivery then
        'Thank you for confirming after redelivery — your project is now complete.'
      else
        'Thank you for confirming — your project is now complete.'
    end,
    designer_update = coalesce(nullif(trim(project_row.customer_name), ''), 'Your client')
      || ' confirmed delivery — project complete.',
    last_updated = last_updated_label,
    updated_at = now(),
    delivery_confirmed_at = now(),
    completed_at = now()
  where id = project_row.id;

  perform set_config('feysefit.allow_concluded_update', 'on', true);
  update public.customer_profiles
  set has_concluded_project = true
  where id = customer_profile_id;

  return project_row.id;
end;
$$;

create or replace function public.report_customer_delivery_issue(
  project_key text,
  issue_type public.delivery_issue_type,
  detail text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_profile_id uuid;
  customer_display_name text;
  project_row public.projects%rowtype;
  issue_row_id uuid;
  last_updated_label text;
  issue_label text;
  next_status public.project_status;
  after_redelivery boolean;
  trimmed_detail text;
begin
  customer_profile_id := public.current_customer_profile_id();
  if customer_profile_id is null then
    raise exception 'Customer profile not found';
  end if;

  trimmed_detail := trim(detail);
  if trimmed_detail = '' then
    raise exception 'Please describe the issue';
  end if;

  select name into customer_display_name
  from public.customer_profiles
  where id = customer_profile_id;

  select * into project_row
  from public.projects
  where (legacy_id = trim(project_key) or id::text = trim(project_key))
    and (
      customer_id = customer_profile_id
      or customer_name = customer_display_name
    )
  limit 1
  for update;

  if not found then
    raise exception 'Project not found';
  end if;

  if project_row.status not in (
    'Awaiting Customer Confirmation'::public.project_status,
    'Delivered'::public.project_status,
    'Re-delivered'::public.project_status
  ) then
    raise exception 'This project is not awaiting your confirmation.';
  end if;

  after_redelivery := project_row.status = 'Re-delivered'::public.project_status;

  if after_redelivery then
    next_status := 'Issue Reported'::public.project_status;
  elsif issue_type in (
    'fitting_problem',
    'wrong_measurement',
    'wrong_fabric',
    'wrong_design_detail'
  ) then
    next_status := 'Adjustment Needed'::public.project_status;
  else
    next_status := 'Issue Reported'::public.project_status;
  end if;

  issue_label := case issue_type
    when 'fitting_problem' then 'Fitting problem'
    when 'wrong_measurement' then 'Wrong measurement'
    when 'wrong_fabric' then 'Wrong fabric'
    when 'wrong_design_detail' then 'Wrong design detail'
    when 'damaged_item' then 'Damaged item'
    when 'missing_item' then 'Missing item'
    when 'delivery_issue' then 'Delivery issue'
    else 'Other concern'
  end;

  last_updated_label := trim(to_char(now(), 'FMDD')) || ' ' || trim(to_char(now(), 'Mon')) || ' ' || trim(to_char(now(), 'YYYY'));

  insert into public.project_delivery_issues (
    project_id,
    customer_id,
    designer_id,
    issue_type,
    detail
  )
  values (
    project_row.id,
    customer_profile_id,
    project_row.designer_id,
    issue_type,
    trimmed_detail
  )
  returning id into issue_row_id;

  update public.projects
  set
    status = next_status,
    customer_update = case
      when after_redelivery then
        'You reported a new concern after redelivery (' || issue_label || '). Your designer will follow up shortly.'
      else
        'You reported a concern (' || issue_label || '). Your designer will follow up shortly.'
    end,
    designer_update = case
      when after_redelivery then
        coalesce(nullif(trim(project_row.customer_name), ''), 'Your client')
          || ' reported a new issue after redelivery: ' || issue_label || ' — "' || trimmed_detail || '"'
      else
        coalesce(nullif(trim(project_row.customer_name), ''), 'Your client')
          || ' reported: ' || issue_label || ' — "' || trimmed_detail || '"'
    end,
    last_updated = last_updated_label,
    updated_at = now()
  where id = project_row.id;

  return issue_row_id;
end;
$$;

revoke all on function public.confirm_customer_project_delivery(text) from public;
grant execute on function public.confirm_customer_project_delivery(text) to authenticated;

revoke all on function public.report_customer_delivery_issue(text, public.delivery_issue_type, text) from public;
grant execute on function public.report_customer_delivery_issue(text, public.delivery_issue_type, text) to authenticated;
