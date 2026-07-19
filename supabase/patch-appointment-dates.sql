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
