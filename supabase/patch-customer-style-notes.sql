-- Customer style notes from onboarding.
-- Run in Supabase SQL editor.

alter table public.customer_profiles
  add column if not exists style_notes text not null default '';
