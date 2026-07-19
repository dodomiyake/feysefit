-- Allow customers to book a designer-published slot as confirmed (no designer approval step).
-- Run after patch-appointment-model.sql in Supabase SQL Editor.

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
