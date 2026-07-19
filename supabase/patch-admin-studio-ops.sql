-- Explicit admin read access for studio operations (walk-in clients + appointments).
-- Run in Supabase SQL Editor if admin lists return empty despite designer data existing.

drop policy if exists "studio_clients_admin_read" on public.studio_clients;
create policy "studio_clients_admin_read" on public.studio_clients
  for select using (public.is_admin());

drop policy if exists "studio_appointments_admin_read" on public.studio_appointments;
create policy "studio_appointments_admin_read" on public.studio_appointments
  for select using (public.is_admin());
