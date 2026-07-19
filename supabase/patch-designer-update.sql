-- Designer-facing project notifications (bell icon for designers).
-- Run in Supabase SQL Editor after schema.sql.

alter table public.projects
  add column if not exists designer_update text not null default '';
