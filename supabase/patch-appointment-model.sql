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
    and status in ('requested', 'confirmed')
    and (
      status = 'requested'
      or scheduled_at is not null
    )
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
