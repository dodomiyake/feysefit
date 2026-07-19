-- Add profile photo URL for customer accounts.
-- Run in Supabase SQL Editor after schema.sql.

alter table public.customer_profiles
  add column if not exists profile_image text not null default '';
