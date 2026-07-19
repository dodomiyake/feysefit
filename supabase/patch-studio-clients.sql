-- Studio (local) clients — designer-owned records for walk-in customers without app accounts.
-- Run in Supabase SQL Editor after schema.sql.

create table if not exists public.studio_clients (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  name text not null,
  phone text not null default '',
  email text not null default '',
  location text not null default '',
  notes text not null default '',
  unit text not null default 'inches' check (unit in ('inches', 'cm')),
  preferred_fit text not null default 'regular',
  measurement_values jsonb not null default '{}'::jsonb,
  reference_images jsonb not null default '[]'::jsonb,
  last_fitting_at text,
  measurement_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_clients_designer_id_idx on public.studio_clients (designer_id);

alter table public.studio_clients enable row level security;

drop policy if exists "studio_clients_designer_manage" on public.studio_clients;

create policy "studio_clients_designer_manage" on public.studio_clients
  for all using (
    designer_id = public.current_designer_profile_id() or public.is_admin()
  )
  with check (
    designer_id = public.current_designer_profile_id() or public.is_admin()
  );
