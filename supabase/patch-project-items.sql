-- FeyseFit: multi-garment items under a single customer project.
-- Run in Supabase SQL Editor after schema / designer-authorized-relationship patches.

begin;

create table if not exists public.project_items (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  project_id uuid not null references public.projects (id) on delete cascade,
  sort_order integer not null default 0,
  title text not null,
  outfit_type text not null default '',
  description text not null default '',
  status public.project_status not null default 'Enquiry',
  deadline text not null default '',
  price text not null default '',
  primary_fabric text not null default '',
  secondary_material text not null default '',
  lining text not null default '',
  reference_images jsonb not null default '[]'::jsonb,
  internal_notes text not null default '',
  measurements jsonb,
  measurements_required boolean not null default false,
  measurement_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_items_project_id_idx on public.project_items (project_id);
create index if not exists project_items_sort_idx on public.project_items (project_id, sort_order);

alter table public.project_items enable row level security;

drop policy if exists "project_items_read_participants" on public.project_items;
create policy "project_items_read_participants" on public.project_items
for select using (
  public.is_admin()
  or public.designer_authorized_for_project(project_id)
  or exists (
    select 1 from public.projects p
    where p.id = project_items.project_id
      and p.customer_id = public.current_customer_profile_id()
  )
);

drop policy if exists "project_items_designer_manage" on public.project_items;
create policy "project_items_designer_manage" on public.project_items
for all using (
  public.is_admin()
  or public.designer_authorized_for_project(project_id)
)
with check (
  public.is_admin()
  or public.designer_authorized_for_project(project_id)
);

-- Backfill one item per existing project (idempotent).
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
  measurements_required
)
select
  p.id,
  0,
  coalesce(nullif(trim(p.title), ''), 'Garment 1'),
  coalesce(nullif(trim(p.outfit_type), ''), 'Bespoke'),
  coalesce(p.description, ''),
  p.status,
  coalesce(p.deadline, ''),
  coalesce(p.budget, ''),
  coalesce(p.primary_fabric, ''),
  coalesce(p.secondary_material, ''),
  coalesce(p.lining, ''),
  coalesce(p.reference_images, '[]'::jsonb),
  coalesce(p.internal_notes, ''),
  p.measurements,
  p.measurements is not null and p.measurements <> '{}'::jsonb
from public.projects p
where not exists (
  select 1 from public.project_items pi where pi.project_id = p.id
);

commit;
