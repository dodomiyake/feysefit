-- Minimal schema for GitHub Actions SQL security assertions.
-- Not a copy of production. Never pointed at a live Supabase project.

create extension if not exists pgcrypto;

do $$ begin
  create role anon nologin;
exception when duplicate_object then null;
end $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null;
end $$;
do $$ begin
  create role service_role nologin bypassrls;
exception when duplicate_object then null;
end $$;

grant usage on schema public to anon, authenticated, service_role;

create schema if not exists auth;
create schema if not exists storage;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$ select '{}'::jsonb $$;

create or replace function auth.role()
returns text
language sql
stable
as $$ select current_setting('role', true) $$;

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$ select string_to_array(name, '/') $$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text
);
alter table storage.objects enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$ select false $$;

create or replace function public.is_aal2()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$ select false $$;

create or replace function public.is_admin_aal2()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$ select false $$;

create or replace function public.current_designer_profile_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$ select null::uuid $$;

create or replace function public.current_customer_profile_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $ select null::uuid $;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $ select null::text $;

create table if not exists public.users (
  id uuid primary key,
  email text,
  name text,
  role text,
  account_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.users enable row level security;

create table if not exists public.designer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  designer_name text,
  business_name text,
  rating numeric default 0,
  review_count integer default 0,
  marketplace_live boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.designer_profiles enable row level security;

do $ begin
  create type public.marketplace_status as enum ('pending', 'approved', 'declined');
exception when duplicate_object then null;
end $;

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid,
  status public.marketplace_status default 'pending'
);
alter table public.marketplace_listings enable row level security;

create table if not exists public.portfolio_images (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid,
  is_public boolean default false
);
alter table public.portfolio_images enable row level security;

create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  name text,
  registration_type text
);
alter table public.customer_profiles enable row level security;

create table if not exists public.designer_customer_relationships (
  designer_id uuid,
  customer_id uuid,
  registration_type text,
  is_active boolean default true,
  primary key (designer_id, customer_id)
);
alter table public.designer_customer_relationships enable row level security;

do $$ begin
  create type public.invite_status as enum ('pending', 'accepted', 'expired');
exception when duplicate_object then null;
end $$;

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid,
  code text unique,
  name text,
  email text,
  project_type text,
  sent_at text,
  sent_ago text,
  status public.invite_status default 'pending',
  created_at timestamptz default now(),
  expires_at timestamptz
);
alter table public.invite_codes enable row level security;

do $$ begin
  create type public.testimonial_status as enum ('active', 'hidden_by_designer', 'removed_by_admin');
exception when duplicate_object then null;
end $$;

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  designer_id uuid,
  customer_id uuid,
  project_id uuid,
  rating integer,
  body text,
  private_feedback text,
  outfit_type text,
  photo_url text,
  allow_public boolean default false,
  show_name boolean default false,
  show_location boolean default false,
  display_name text,
  display_location text,
  status public.testimonial_status default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.testimonials enable row level security;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_code text,
  title text,
  customer_name text,
  customer_id uuid,
  designer_id uuid,
  outfit_type text,
  deadline date,
  budget numeric,
  status text
);
alter table public.projects enable row level security;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  sender_id uuid
);
alter table public.messages enable row level security;

create table if not exists public.project_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid
);
alter table public.project_items enable row level security;

create table if not exists public.rate_limit_counters (
  bucket_key text primary key,
  hit_count integer not null default 0,
  window_started_at timestamptz not null default now()
);
alter table public.rate_limit_counters enable row level security;

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text,
  email_hash text,
  ip text,
  user_agent text,
  meta jsonb,
  created_at timestamptz default now()
);
alter table public.security_events enable row level security;

create or replace function public.lookup_invite_code(invite_code text)
returns json language sql as $$ select null::json $$;

create or replace function public.log_security_event(
  p_event_type text,
  p_email_hash text default null,
  p_ip text default null,
  p_user_agent text default null,
  p_meta jsonb default '{}'::jsonb
) returns void language sql as $$ select null $$;

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
) returns boolean language sql as $$ select true $$;

create or replace function public.project_status_blocks_unlink()
returns boolean language sql as $$ select false $$;

create or replace function public.touch_testimonial_updated_at()
returns trigger language plpgsql as $$ begin return new; end $$;

create or replace function public.redact_ip_hint(text)
returns text language sql as $$ select $1 $$;

create or replace function public.touch_delivery_issue_updated_at()
returns trigger language plpgsql as $$ begin return new; end $$;

create or replace function public.coarse_device_hint(text)
returns text language sql as $$ select $1 $$;

create or replace function public.is_messaging_shell_project(uuid)
returns boolean language sql as $$ select false $$;

create or replace function public.project_is_active_for_customer(uuid)
returns boolean language sql as $$ select true $$;

grant execute on function public.consume_rate_limit(text, integer, integer) to anon, authenticated;
grant execute on function public.log_security_event(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.lookup_invite_code(text) to anon, authenticated;

create or replace function public.log_account_activity(
  p_event_type text,
  p_email text default null,
  p_ip text default null,
  p_user_agent text default null,
  p_meta jsonb default '{}'::jsonb
) returns void language sql as $$ select null $$;
grant execute on function public.log_account_activity(text, text, text, text, jsonb) to anon, authenticated;

create table if not exists public.account_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_type text not null,
  ip_hint text,
  device_hint text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.account_activity enable row level security;

alter table storage.objects add column if not exists created_at timestamptz default now();
alter table storage.objects add column if not exists updated_at timestamptz default now();
grant update (rating, review_count, marketplace_live) on table public.designer_profiles to authenticated;
grant truncate, trigger, references on table public.designer_profiles to anon, authenticated;

-- Minimal read-only marketplace views used only by disposable SQL assertions.
create or replace view public.marketplace_designers
with (security_invoker = true)
as
select *
from (
  select d.id, d.business_name
  from public.designer_profiles d
  where d.marketplace_live = true
    and exists (
      select 1
      from public.marketplace_listings ml
      where ml.designer_id = d.id
        and ml.status = 'approved'
    )
  offset 0
) public_rows;

create or replace view public.marketplace_testimonials
with (security_invoker = true)
as
select *
from (
  select t.id, t.designer_id
  from public.testimonials t
  where t.allow_public = true
    and t.status = 'active'
  offset 0
) public_rows;

grant select on public.marketplace_designers to anon, authenticated;
grant select on public.marketplace_testimonials to anon, authenticated;
