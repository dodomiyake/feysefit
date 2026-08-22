drop function if exists public.create_designer_project(uuid, uuid, text, text, text, text, text, text, text[], jsonb);
drop function if exists public.create_designer_project(uuid, uuid, text, text, text, text, text, text, jsonb, jsonb);

create or replace function public.create_designer_project(
  p_designer_id uuid,
  p_customer_id uuid,
  p_title text,
  p_customer_name text,
  p_outfit_type text,
  p_deadline text,
  p_budget text,
  p_description text default '',
  p_reference_images jsonb default '[]'::jsonb,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_project_id uuid;
  v_code text;
  v_now timestamptz := clock_timestamp();
  v_item jsonb;
  v_index integer := 0;
  v_item_status project_status;
  v_item_reference_images jsonb;
  v_reference_images jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in again to create a project.' using errcode = 'P0001';
  end if;

  if p_designer_id is null or not exists (
    select 1
    from public.designer_profiles d
    where d.id = p_designer_id
      and d.user_id = auth.uid()
  ) then
    raise exception 'Designer profile not found for this account. Sign out and sign back in.' using errcode = 'P0001';
  end if;

  if p_customer_id is null or not exists (
    select 1
    from public.designer_customer_relationships r
    where r.designer_id = p_designer_id
      and r.customer_id = p_customer_id
      and r.is_active = true
  ) then
    raise exception 'You can only create projects for clients who have an active relationship with your atelier.' using errcode = 'P0001';
  end if;

  v_reference_images := case
    when jsonb_typeof(coalesce(p_reference_images, '[]'::jsonb)) = 'array'
      then coalesce(p_reference_images, '[]'::jsonb)
    else '[]'::jsonb
  end;

  v_code := 'FF-' || right(floor(extract(epoch from v_now) * 1000)::bigint::text, 6);

  insert into public.projects (
    project_code,
    title,
    customer_name,
    customer_id,
    studio_client_id,
    designer_id,
    outfit_type,
    deadline,
    budget,
    description,
    status,
    reference_images,
    internal_notes,
    measurements,
    measurement_recorded_by,
    customer_update,
    started_date,
    last_updated,
    updated_at
  ) values (
    v_code,
    nullif(trim(p_title), ''),
    nullif(trim(p_customer_name), ''),
    p_customer_id,
    null,
    p_designer_id,
    coalesce(nullif(trim(p_outfit_type), ''), 'Bespoke'),
    coalesce(p_deadline, ''),
    coalesce(p_budget, ''),
    coalesce(trim(p_description), ''),
    'Enquiry'::project_status,
    v_reference_images,
    '',
    null,
    null,
    'Project created — your designer will share updates here.',
    to_char(v_now, 'Mon FMDD, YYYY'),
    to_char(v_now, 'FMDD Mon YYYY'),
    v_now
  ) returning id into v_project_id;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) = 'array' then
    for v_item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
      v_item_status := coalesce(nullif(v_item->>'status', '')::project_status, 'Enquiry'::project_status);
      v_item_reference_images := case
        when jsonb_typeof(v_item->'referenceImages') = 'array' then v_item->'referenceImages'
        else '[]'::jsonb
      end;

      insert into public.project_items (
        project_id,
        sort_order,
        title,
        outfit_type,
        description,
        status,
        deadline,
        price,
        primary_fabric,
        secondary_material,
        lining,
        reference_images,
        internal_notes,
        measurements,
        measurements_required,
        measurement_notes
      ) values (
        v_project_id,
        coalesce((v_item->>'sortOrder')::integer, v_index),
        coalesce(nullif(trim(v_item->>'title'), ''), nullif(trim(p_title), ''), 'New garment'),
        coalesce(nullif(trim(v_item->>'outfitType'), ''), coalesce(nullif(trim(p_outfit_type), ''), 'Bespoke')),
        coalesce(trim(v_item->>'description'), ''),
        v_item_status,
        coalesce(v_item->>'deadline', p_deadline, ''),
        coalesce(v_item->>'price', p_budget, ''),
        coalesce(v_item->>'primaryFabric', ''),
        coalesce(v_item->>'secondaryMaterial', ''),
        coalesce(v_item->>'lining', ''),
        v_item_reference_images,
        coalesce(v_item->>'internalNotes', ''),
        case
          when jsonb_typeof(v_item->'measurements') = 'object' then v_item->'measurements'
          else null
        end,
        coalesce((v_item->>'measurementsRequired')::boolean, false),
        coalesce(v_item->>'measurementNotes', '')
      );

      v_index := v_index + 1;
    end loop;
  end if;

  return v_project_id;
end;
$$;

revoke all on function public.create_designer_project(uuid, uuid, text, text, text, text, text, text, jsonb, jsonb) from public;
revoke all on function public.create_designer_project(uuid, uuid, text, text, text, text, text, text, jsonb, jsonb) from anon;
grant execute on function public.create_designer_project(uuid, uuid, text, text, text, text, text, text, jsonb, jsonb) to authenticated;
