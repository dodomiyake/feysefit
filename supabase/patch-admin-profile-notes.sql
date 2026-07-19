-- Admin-only notes on customer and designer profiles.
-- Run in Supabase SQL editor.

alter table public.customer_profiles
  add column if not exists admin_notes text;

alter table public.designer_profiles
  add column if not exists admin_notes text;
