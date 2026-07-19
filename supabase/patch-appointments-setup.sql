-- Appointments feature � run once in Supabase SQL Editor after schema.sql.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE throughout).
--
-- Combines patch-local-customers-mvp.sql, patch-appointment-model.sql,
-- and patch-appointment-dates.sql in the correct order.

-- ========== patch-local-customers-mvp.sql ==========

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


-- ========== patch-appointment-model.sql ==========

-- Appointment model: availability windows, meeting modes, no_show, anti-poaching.
-- Run after patch-local-customers-mvp.sql in Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- Anti-poaching helper (customers may only book their own designer)
-- ---------------------------------------------------------------------------
create or replace function public.customer_may_book_designer(target_designer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_customer_profile_id() is not null
    and (
      exists (
        select 1
        from public.designer_customer_relationships r
        where r.designer_id = target_designer_id
          and r.customer_id = public.current_customer_profile_id()
          and r.is_active = true
      )
      or exists (
        select 1
        from public.projects p
        where p.designer_id = target_designer_id
          and p.customer_id = public.current_customer_profile_id()
          and p.status <> 'Delivered'::public.project_status
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- Designer availability (weekly windows)
-- ---------------------------------------------------------------------------
create table if not exists public.designer_availability_windows (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists designer_availability_windows_designer_id_idx
  on public.designer_availability_windows (designer_id);

alter table public.designer_availability_windows enable row level security;

drop policy if exists "availability_designer_manage" on public.designer_availability_windows;
create policy "availability_designer_manage" on public.designer_availability_windows
  for all using (
    designer_id = public.current_designer_profile_id() or public.is_admin()
  )
  with check (
    designer_id = public.current_designer_profile_id() or public.is_admin()
  );

drop policy if exists "availability_customer_read" on public.designer_availability_windows;
create policy "availability_customer_read" on public.designer_availability_windows
  for select using (
    exists (
      select 1
      from public.designer_profiles d
      where d.id = designer_id
        and d.marketplace_live = true
    )
    or public.customer_may_book_designer(designer_id)
  );

-- Slot length + remote meeting modes on designer profile
alter table public.designer_profiles
  add column if not exists appointment_slot_minutes int not null default 30;

alter table public.designer_profiles
  add column if not exists offered_meeting_modes text[] not null default array['in_person', 'video', 'phone']::text[];

-- ---------------------------------------------------------------------------
-- Extend studio_appointments
-- ---------------------------------------------------------------------------
alter table public.studio_appointments
  add column if not exists meeting_mode text not null default 'in_person';

alter table public.studio_appointments drop constraint if exists studio_appointments_appointment_type_check;
alter table public.studio_appointments add constraint studio_appointments_appointment_type_check check (
  appointment_type in (
    'measurement',
    'consultation',
    'fitting',
    'first_fitting',
    'final_fitting',
    'alteration',
    'pickup'
  )
);

alter table public.studio_appointments drop constraint if exists studio_appointments_status_check;
alter table public.studio_appointments add constraint studio_appointments_status_check check (
  status in ('requested', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show')
);

alter table public.studio_appointments drop constraint if exists studio_appointments_meeting_mode_check;
alter table public.studio_appointments add constraint studio_appointments_meeting_mode_check check (
  meeting_mode in ('in_person', 'video', 'phone', 'pickup', 'local_delivery')
);

-- ---------------------------------------------------------------------------
-- Tighten customer appointment requests
-- ---------------------------------------------------------------------------
drop policy if exists "studio_appointments_customer_request" on public.studio_appointments;
create policy "studio_appointments_customer_request" on public.studio_appointments
  for insert with check (
    customer_id = public.current_customer_profile_id()
    and studio_client_id is null
    and status = 'requested'
    and public.customer_may_book_designer(designer_id)
    and exists (
      select 1
      from public.designer_profiles d
      where d.id = designer_id
        and (
          d.offers_in_person = true
          or d.offered_meeting_modes && array['video', 'phone']::text[]
        )
    )
  );


-- ========== patch-appointment-dates.sql ==========

-- Calendar-based designer availability + slot conflict prevention.
-- Run after patch-appointment-model.sql in Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- Specific dates (replaces weekly windows for customer booking)
-- ---------------------------------------------------------------------------
create table if not exists public.designer_availability_dates (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  available_date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists designer_availability_dates_designer_id_idx
  on public.designer_availability_dates (designer_id);

create index if not exists designer_availability_dates_date_idx
  on public.designer_availability_dates (designer_id, available_date);

alter table public.designer_availability_dates enable row level security;

drop policy if exists "availability_dates_designer_manage" on public.designer_availability_dates;
create policy "availability_dates_designer_manage" on public.designer_availability_dates
  for all using (
    designer_id = public.current_designer_profile_id() or public.is_admin()
  )
  with check (
    designer_id = public.current_designer_profile_id() or public.is_admin()
  );

drop policy if exists "availability_dates_customer_read" on public.designer_availability_dates;
create policy "availability_dates_customer_read" on public.designer_availability_dates
  for select using (
    public.customer_may_book_designer(designer_id)
    or exists (
      select 1
      from public.designer_profiles d
      where d.id = designer_id
        and d.marketplace_live = true
    )
  );

-- ---------------------------------------------------------------------------
-- Linked customers can see which slots are already taken (no customer names)
-- ---------------------------------------------------------------------------
create or replace function public.get_designer_appointment_holds(target_designer_id uuid)
returns table (
  scheduled_at timestamptz,
  duration_minutes int,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select a.scheduled_at, a.duration_minutes, a.status
  from public.studio_appointments a
  where a.designer_id = target_designer_id
    and a.scheduled_at is not null
    and a.status in ('requested', 'confirmed', 'rescheduled')
    and (
      public.customer_may_book_designer(target_designer_id)
      or public.current_designer_profile_id() = target_designer_id
      or public.is_admin()
    );
$$;

grant execute on function public.get_designer_appointment_holds(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Prevent double-booking the same designer time slot
-- ---------------------------------------------------------------------------
create or replace function public.enforce_appointment_slot_conflict()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.scheduled_at is null then
    return new;
  end if;

  if new.status in ('cancelled', 'completed', 'no_show') then
    return new;
  end if;

  if exists (
    select 1
    from public.studio_appointments a
    where a.designer_id = new.designer_id
      and a.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and a.scheduled_at is not null
      and a.status in ('requested', 'confirmed', 'rescheduled')
      and tstzrange(
            a.scheduled_at,
            a.scheduled_at + make_interval(mins => a.duration_minutes),
            '[)'
          )
          && tstzrange(
            new.scheduled_at,
            new.scheduled_at + make_interval(mins => new.duration_minutes),
            '[)'
          )
  ) then
    raise exception 'This time slot is no longer available';
  end if;

  return new;
end;
$$;

drop trigger if exists studio_appointments_slot_conflict on public.studio_appointments;
create trigger studio_appointments_slot_conflict
  before insert or update of scheduled_at, duration_minutes, status, designer_id
  on public.studio_appointments
  for each row
  execute function public.enforce_appointment_slot_conflict();

