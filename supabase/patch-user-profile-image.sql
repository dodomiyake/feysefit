-- Profile photo URL for admin (and all) accounts on public.users.
-- Run in Supabase SQL Editor after schema.sql.

alter table public.users
  add column if not exists profile_image text not null default '';
