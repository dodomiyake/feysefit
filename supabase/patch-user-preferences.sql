-- User settings preferences + project creative description
-- Run in Supabase SQL editor after schema.sql

create table if not exists public.user_preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  measurement_unit text not null default 'inches' check (measurement_unit in ('inches', 'cm')),
  email_digests boolean not null default true,
  push_alerts boolean not null default true,
  profile_visibility text not null default 'connections'
    check (profile_visibility in ('connections', 'everyone')),
  two_factor_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists description text not null default '';

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_read_own" on public.user_preferences;
drop policy if exists "user_preferences_upsert_own" on public.user_preferences;

create policy "user_preferences_read_own" on public.user_preferences
  for select using (user_id = auth.uid());

create policy "user_preferences_upsert_own" on public.user_preferences
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());
