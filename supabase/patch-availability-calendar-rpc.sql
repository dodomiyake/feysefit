-- Linked clients can read a designer's published availability calendar.
-- Run in Supabase SQL Editor (safe to re-run).

create or replace function public.get_designer_availability_calendar(target_designer_id uuid)
returns table (
  id uuid,
  available_date date,
  start_time time,
  end_time time,
  appointment_slot_minutes int,
  offered_meeting_modes text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id,
    d.available_date,
    d.start_time,
    d.end_time,
    coalesce(p.appointment_slot_minutes, 30) as appointment_slot_minutes,
    coalesce(p.offered_meeting_modes, array['in_person', 'video', 'phone']::text[]) as offered_meeting_modes
  from public.designer_availability_dates d
  join public.designer_profiles p on p.id = d.designer_id
  where d.designer_id = target_designer_id
    and d.available_date >= (timezone('utc', now()))::date - 1
    and (
      public.current_designer_profile_id() = target_designer_id
      or public.is_admin()
      or public.customer_may_book_designer(target_designer_id)
      or p.marketplace_live = true
    )
  order by d.available_date, d.start_time;
$$;

grant execute on function public.get_designer_availability_calendar(uuid) to authenticated;
