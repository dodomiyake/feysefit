-- Allow invite landing pages to show designer name for pending invitations.
-- Run in Supabase SQL Editor if /join/FF-XXXX cannot load designer details.

drop policy if exists "designer_profiles_read_pending_invite" on public.designer_profiles;
create policy "designer_profiles_read_pending_invite" on public.designer_profiles
  for select
  using (
    exists (
      select 1
      from public.invite_codes ic
      where ic.designer_id = designer_profiles.id
        and ic.status = 'pending'
    )
  );
