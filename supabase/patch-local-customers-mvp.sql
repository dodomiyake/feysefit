-- Local customers MVP — studio clients, appointments, fittings, delivery, payments, groups.
-- Run in Supabase SQL Editor after schema.sql (includes patch-studio-clients.sql).

-- ---------------------------------------------------------------------------
-- Studio (walk-in) clients — private to each designer
-- ---------------------------------------------------------------------------
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
  measurement_recorded_by text not null default 'designer'
    check (measurement_recorded_by in ('customer', 'designer')),
  reference_images jsonb not null default '[]'::jsonb,
  last_fitting_at text,
  measurement_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studio_clients
  add column if not exists measurement_recorded_by text not null default 'designer'
    check (measurement_recorded_by in ('customer', 'designer'));

alter table public.studio_clients
  add column if not exists reference_images jsonb not null default '[]'::jsonb;

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

-- ---------------------------------------------------------------------------
-- Appointments (measurement, consultation, fitting, alteration, pickup)
-- ---------------------------------------------------------------------------
create table if not exists public.studio_appointments (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  studio_client_id uuid references public.studio_clients (id) on delete cascade,
  customer_id uuid references public.customer_profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  appointment_type text not null check (
    appointment_type in ('measurement', 'consultation', 'fitting', 'alteration', 'pickup')
  ),
  status text not null default 'requested' check (
    status in ('requested', 'confirmed', 'rescheduled', 'cancelled', 'completed')
  ),
  scheduled_at timestamptz,
  duration_minutes int not null default 60,
  location_notes text not null default '',
  customer_notes text not null default '',
  designer_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    studio_client_id is not null or customer_id is not null
  )
);

create index if not exists studio_appointments_designer_id_idx on public.studio_appointments (designer_id);
create index if not exists studio_appointments_scheduled_at_idx on public.studio_appointments (scheduled_at);

alter table public.studio_appointments enable row level security;

drop policy if exists "studio_appointments_designer_manage" on public.studio_appointments;
create policy "studio_appointments_designer_manage" on public.studio_appointments
  for all using (
    designer_id = public.current_designer_profile_id() or public.is_admin()
  )
  with check (
    designer_id = public.current_designer_profile_id() or public.is_admin()
  );

drop policy if exists "studio_appointments_customer_request" on public.studio_appointments;
create policy "studio_appointments_customer_request" on public.studio_appointments
  for insert with check (
    customer_id = public.current_customer_profile_id()
    and studio_client_id is null
  );

drop policy if exists "studio_appointments_customer_read" on public.studio_appointments;
create policy "studio_appointments_customer_read" on public.studio_appointments
  for select using (
    customer_id = public.current_customer_profile_id()
  );

-- ---------------------------------------------------------------------------
-- Group / aso-ebi projects
-- ---------------------------------------------------------------------------
create table if not exists public.group_projects (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  title text not null,
  event_type text not null default 'aso-ebi' check (
    event_type in ('wedding', 'aso-ebi', 'family', 'couples', 'church', 'birthday', 'other')
  ),
  event_date text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_project_members (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  group_project_id uuid not null references public.group_projects (id) on delete cascade,
  studio_client_id uuid references public.studio_clients (id) on delete set null,
  customer_id uuid references public.customer_profiles (id) on delete set null,
  member_name text not null,
  outfit_status text not null default 'pending' check (
    outfit_status in ('pending', 'measured', 'in_production', 'fitting', 'ready', 'delivered')
  ),
  unit text not null default 'inches' check (unit in ('inches', 'cm')),
  preferred_fit text not null default 'regular',
  measurement_values jsonb not null default '{}'::jsonb,
  measurement_recorded_by text not null default 'designer'
    check (measurement_recorded_by in ('customer', 'designer')),
  total_price numeric(12, 2),
  deposit_paid numeric(12, 2),
  payment_method text not null default '',
  payment_notes text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists group_projects_designer_id_idx on public.group_projects (designer_id);
create index if not exists group_project_members_group_id_idx on public.group_project_members (group_project_id);

alter table public.group_projects enable row level security;
alter table public.group_project_members enable row level security;

drop policy if exists "group_projects_designer_manage" on public.group_projects;
create policy "group_projects_designer_manage" on public.group_projects
  for all using (
    designer_id = public.current_designer_profile_id() or public.is_admin()
  )
  with check (
    designer_id = public.current_designer_profile_id() or public.is_admin()
  );

drop policy if exists "group_project_members_designer_manage" on public.group_project_members;
create policy "group_project_members_designer_manage" on public.group_project_members
  for all using (
    exists (
      select 1 from public.group_projects gp
      where gp.id = group_project_members.group_project_id
        and (gp.designer_id = public.current_designer_profile_id() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.group_projects gp
      where gp.id = group_project_members.group_project_id
        and (gp.designer_id = public.current_designer_profile_id() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Project local ops: fittings, delivery, payments, studio client link
-- ---------------------------------------------------------------------------
alter table public.projects
  add column if not exists studio_client_id uuid references public.studio_clients (id) on delete set null,
  add column if not exists group_project_id uuid references public.group_projects (id) on delete set null,
  add column if not exists delivery_method text check (
    delivery_method is null or delivery_method in (
      'customer_pickup', 'local_delivery', 'courier_delivery', 'designer_dropoff'
    )
  ),
  add column if not exists local_delivery_status text check (
    local_delivery_status is null or local_delivery_status in (
      'ready_for_pickup', 'pickup_scheduled', 'out_for_delivery', 'delivered', 'collected'
    )
  ),
  add column if not exists first_fitting_at text,
  add column if not exists second_fitting_at text,
  add column if not exists final_fitting_at text,
  add column if not exists fitting_notes text not null default '',
  add column if not exists adjustment_notes text not null default '',
  add column if not exists total_price numeric(12, 2),
  add column if not exists deposit_paid numeric(12, 2),
  add column if not exists payment_method text not null default '',
  add column if not exists payment_notes text not null default '',
  add column if not exists measurement_recorded_by text check (
    measurement_recorded_by is null or measurement_recorded_by in ('customer', 'designer')
  );

-- ---------------------------------------------------------------------------
-- Measurements: who recorded them
-- ---------------------------------------------------------------------------
alter table public.measurements
  add column if not exists recorded_by text not null default 'customer'
    check (recorded_by in ('customer', 'designer'));

-- ---------------------------------------------------------------------------
-- Designer marketplace: location & in-person filters
-- ---------------------------------------------------------------------------
alter table public.designer_profiles
  add column if not exists city text not null default '',
  add column if not exists country text not null default '',
  add column if not exists offers_in_person boolean not null default false,
  add column if not exists price_range_min int,
  add column if not exists price_range_max int;
