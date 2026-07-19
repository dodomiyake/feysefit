-- Let customers sync measurement submissions to their project timeline.
-- Run in Supabase SQL Editor after schema.sql and patch-designer-update.sql.

create or replace function public.apply_customer_measurement_submission(
  measurement_values jsonb,
  customer_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_profile_id uuid;
  project_row public.projects%rowtype;
  display_name text;
  advanced_to_design boolean;
  last_updated_label text;
begin
  customer_profile_id := public.current_customer_profile_id();
  if customer_profile_id is null then
    raise exception 'Customer profile not found';
  end if;

  select * into project_row
  from public.projects
  where customer_id = customer_profile_id
    and status <> 'Delivered'::public.project_status
  order by created_at desc
  limit 1
  for update;

  if not found then
    return null;
  end if;

  display_name := coalesce(
    nullif(trim(customer_display_name), ''),
    (select name from public.customer_profiles where id = customer_profile_id),
    'Your client'
  );

  advanced_to_design := project_row.status = 'Measurements Needed'::public.project_status;
  last_updated_label := trim(to_char(now(), 'FMDD')) || ' ' || trim(to_char(now(), 'Mon')) || ' ' || trim(to_char(now(), 'YYYY'));

  update public.projects
  set
    measurements = measurement_values,
    status = case
      when advanced_to_design then 'Design Confirmed'::public.project_status
      else project_row.status
    end,
    customer_update = case
      when advanced_to_design then 'Measurements received — your project is now in design review.'
      else 'Thank you — your measurements were received by your designer.'
    end,
    designer_update = display_name || ' submitted measurements — ready for design review.',
    last_updated = last_updated_label,
    updated_at = now()
  where id = project_row.id;

  return project_row.id;
end;
$$;

revoke all on function public.apply_customer_measurement_submission(jsonb, text) from public;
grant execute on function public.apply_customer_measurement_submission(jsonb, text) to authenticated;

create or replace function public.apply_customer_project_designer_update(
  designer_update_message text,
  project_key text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_profile_id uuid;
  project_row public.projects%rowtype;
  last_updated_label text;
begin
  if nullif(trim(designer_update_message), '') is null then
    return;
  end if;

  customer_profile_id := public.current_customer_profile_id();
  if customer_profile_id is null then
    raise exception 'Customer profile not found';
  end if;

  last_updated_label := trim(to_char(now(), 'FMDD')) || ' ' || trim(to_char(now(), 'Mon')) || ' ' || trim(to_char(now(), 'YYYY'));

  if project_key is not null and nullif(trim(project_key), '') is not null then
    select * into project_row
    from public.projects
    where customer_id = customer_profile_id
      and (legacy_id = trim(project_key) or id::text = trim(project_key))
    limit 1
    for update;
  else
    select * into project_row
    from public.projects
    where customer_id = customer_profile_id
      and status <> 'Delivered'::public.project_status
    order by created_at desc
    limit 1
    for update;
  end if;

  if not found then
    return;
  end if;

  update public.projects
  set
    designer_update = trim(designer_update_message),
    last_updated = last_updated_label,
    updated_at = now()
  where id = project_row.id;
end;
$$;

revoke all on function public.apply_customer_project_designer_update(text, text) from public;
grant execute on function public.apply_customer_project_designer_update(text, text) to authenticated;
