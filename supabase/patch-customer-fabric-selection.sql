-- Customer fabric picks + designer fabric advice on projects.
-- Run in Supabase SQL Editor after schema.sql.

alter table public.projects
  add column if not exists designer_fabric_advice text not null default '';

create or replace function public.update_customer_fabric_selection(
  project_key text,
  primary_fabric text,
  secondary_material text,
  lining text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_profile_id uuid;
  project_row public.projects%rowtype;
  display_name text;
  last_updated_label text;
begin
  customer_profile_id := public.current_customer_profile_id();
  if customer_profile_id is null then
    raise exception 'Customer profile not found';
  end if;

  if nullif(trim(project_key), '') is null then
    raise exception 'Project is required';
  end if;

  select * into project_row
  from public.projects
  where customer_id = customer_profile_id
    and (legacy_id = trim(project_key) or id::text = trim(project_key))
  for update;

  if not found then
    raise exception 'Project not found';
  end if;

  if nullif(trim(primary_fabric), '') is null then
    raise exception 'Select a primary fabric';
  end if;
  if nullif(trim(lining), '') is null then
    raise exception 'Select a lining';
  end if;

  display_name := coalesce(
    (select name from public.customer_profiles where id = customer_profile_id),
    'Your client'
  );
  last_updated_label := trim(to_char(now(), 'FMDD')) || ' ' || trim(to_char(now(), 'Mon')) || ' ' || trim(to_char(now(), 'YYYY'));

  update public.projects
  set
    primary_fabric = trim(update_customer_fabric_selection.primary_fabric),
    secondary_material = coalesce(
      nullif(trim(update_customer_fabric_selection.secondary_material), ''),
      'None — primary fabric only'
    ),
    lining = trim(update_customer_fabric_selection.lining),
    customer_update = 'Fabric selections saved — your designer will review and advise.',
    designer_update = display_name || ' updated fabric selections.',
    last_updated = last_updated_label,
    updated_at = now()
  where id = project_row.id;
end;
$$;

revoke all on function public.update_customer_fabric_selection(text, text, text, text) from public;
grant execute on function public.update_customer_fabric_selection(text, text, text, text) to authenticated;
