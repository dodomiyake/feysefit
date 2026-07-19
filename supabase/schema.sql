-- FeyseFit Supabase schema
-- Run in Supabase SQL Editor or via: supabase db push
--
-- NEW PROJECT: paste and run THIS ENTIRE FILE (do not use patch-*.sql first).
-- Patch files only fix partial installs; they will fail if tables do not exist yet.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('designer', 'customer', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.project_status as enum (
    'Enquiry',
    'Measurements Needed',
    'Design Confirmed',
    'In Production',
    'Ready for Delivery',
    'Delivered'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.invite_status as enum ('pending', 'accepted', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.marketplace_status as enum ('pending', 'approved', 'declined');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.measurement_status as enum ('draft', 'submitted');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.report_status as enum ('open', 'dismissed', 'resolved');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.unlink_status as enum ('none', 'pending', 'designer_review', 'approved', 'declined');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.registration_type as enum ('invited', 'direct');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.account_status as enum ('active', 'suspended', 'banned');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Users (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null,
  role public.user_role not null default 'customer',
  account_status public.account_status not null default 'active',
  profile_image text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- User preferences (settings)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Designer profiles
-- ---------------------------------------------------------------------------
create table if not exists public.designer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  legacy_id text unique,
  business_name text not null,
  designer_name text not null,
  location text not null default '',
  specialty text not null default '',
  bio text not null default '',
  rating numeric(3, 2) not null default 0,
  review_count int not null default 0,
  cover_image text not null default '',
  profile_image text not null default '',
  marketplace_live boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Customer profiles
-- ---------------------------------------------------------------------------
create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users (id) on delete cascade,
  legacy_id text unique,
  name text not null,
  location text not null default '',
  phone text not null default '',
  email text not null,
  profile_image text not null default '',
  style_notes text not null default '',
  project_count int not null default 0,
  registration_type public.registration_type,
  has_concluded_project boolean not null default false,
  unlink_status public.unlink_status not null default 'none',
  unlink_reason text,
  unlink_submitted_at text,
  active_unlink_request_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Designer ↔ Customer relationships
-- ---------------------------------------------------------------------------
create table if not exists public.designer_customer_relationships (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  customer_id uuid not null references public.customer_profiles (id) on delete cascade,
  registration_type public.registration_type not null default 'invited',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (designer_id, customer_id)
);

-- ---------------------------------------------------------------------------
-- Invite codes
-- ---------------------------------------------------------------------------
create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  code text not null unique,
  name text not null,
  email text not null,
  project_type text not null,
  sent_at text not null,
  sent_ago text not null default '',
  status public.invite_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  project_code text not null,
  palette_id text not null default 'default',
  title text not null,
  customer_name text not null,
  customer_id uuid references public.customer_profiles (id) on delete set null,
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  outfit_type text not null,
  deadline text not null,
  budget text not null,
  status public.project_status not null default 'Enquiry',
  reference_images jsonb not null default '[]'::jsonb,
  customer_update text not null default '',
  designer_update text not null default '',
  internal_notes text not null default '',
  description text not null default '',
  measurements jsonb,
  gallery_images jsonb,
  primary_fabric text,
  secondary_material text,
  lining text,
  designer_fabric_advice text not null default '',
  started_date text,
  estimated_delivery text,
  measurement_fit_note text,
  team_members jsonb,
  last_updated text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Customer style references (per project)
-- ---------------------------------------------------------------------------
create table if not exists public.customer_references (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  project_id uuid not null references public.projects (id) on delete cascade,
  url text not null,
  category text not null,
  caption text,
  uploaded_at text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Measurements (customer profile + optional project link)
-- ---------------------------------------------------------------------------
create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  unit text not null default 'inches',
  preferred_fit text not null default 'regular',
  status public.measurement_status not null default 'draft',
  values jsonb not null default '{}'::jsonb,
  updated_at text,
  created_at timestamptz not null default now(),
  unique (customer_id, project_id)
);

-- ---------------------------------------------------------------------------
-- Messages (per project)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  project_id uuid not null references public.projects (id) on delete cascade,
  sender_user_id uuid references public.users (id) on delete set null,
  sender_role text not null check (sender_role in ('designer', 'customer')),
  sender_name text not null,
  text text not null,
  timestamp_label text not null,
  attachments jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Marketplace listings
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  designer_name text not null,
  business_name text not null,
  specialty text not null,
  submitted_at text not null,
  status public.marketplace_status not null default 'pending',
  admin_notes text,
  decline_reason text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Portfolio images
-- ---------------------------------------------------------------------------
create table if not exists public.portfolio_images (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Project images
-- ---------------------------------------------------------------------------
create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  url text not null,
  image_type text not null default 'reference',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Unlink requests
-- ---------------------------------------------------------------------------
create table if not exists public.unlink_requests (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  customer_id uuid not null references public.customer_profiles (id) on delete cascade,
  customer_name text not null,
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  designer_name text not null,
  reason text not null,
  submitted_at text not null,
  status text not null default 'pending',
  admin_notes text,
  admin_contacted_at text,
  designer_confirmation text,
  designer_response text,
  designer_responded_at text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  reporter_id uuid references public.users (id) on delete set null,
  reported_user_id uuid references public.users (id) on delete set null,
  handle text not null,
  reported_name text,
  priority text not null default 'Medium',
  reason text not null,
  detail text not null default '',
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Idempotent column patches (safe when tables already exist from older runs)
-- Re-creates enum types if you are re-running from here without the top of file.
-- ---------------------------------------------------------------------------
do $$ begin create type public.user_role as enum ('designer', 'customer', 'admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.project_status as enum ('Enquiry', 'Measurements Needed', 'Design Confirmed', 'In Production', 'Ready for Delivery', 'Delivered'); exception when duplicate_object then null; end $$;
do $$ begin create type public.invite_status as enum ('pending', 'accepted', 'expired'); exception when duplicate_object then null; end $$;
do $$ begin create type public.marketplace_status as enum ('pending', 'approved', 'declined'); exception when duplicate_object then null; end $$;
do $$ begin create type public.measurement_status as enum ('draft', 'submitted'); exception when duplicate_object then null; end $$;
do $$ begin create type public.report_status as enum ('open', 'dismissed', 'resolved'); exception when duplicate_object then null; end $$;
do $$ begin create type public.unlink_status as enum ('none', 'pending', 'designer_review', 'approved', 'declined'); exception when duplicate_object then null; end $$;
do $$ begin create type public.registration_type as enum ('invited', 'direct'); exception when duplicate_object then null; end $$;
do $$ begin create type public.account_status as enum ('active', 'suspended', 'banned'); exception when duplicate_object then null; end $$;

alter table public.users
  add column if not exists profile_image text not null default '';

alter table public.users
  add column if not exists account_status public.account_status not null default 'active';

alter table public.designer_profiles
  add column if not exists legacy_id text;

alter table public.designer_profiles
  add column if not exists marketplace_live boolean not null default false;

alter table public.designer_profiles
  add column if not exists cover_image text not null default '';

alter table public.designer_profiles
  add column if not exists profile_image text not null default '';

alter table public.designer_profiles
  add column if not exists admin_notes text;

alter table public.designer_profiles
  add column if not exists rating numeric(3, 2) not null default 0;

alter table public.designer_profiles
  add column if not exists review_count int not null default 0;

alter table public.designer_profiles
  add column if not exists updated_at timestamptz not null default now();

alter table public.designer_profiles
  add column if not exists years_experience int;

alter table public.designer_profiles
  add column if not exists city text not null default '',
  add column if not exists country text not null default '',
  add column if not exists offers_in_person boolean not null default false,
  add column if not exists price_range_min int,
  add column if not exists price_range_max int;

alter table public.customer_profiles
  add column if not exists legacy_id text;

alter table public.customer_profiles
  add column if not exists location text not null default '';

alter table public.customer_profiles
  add column if not exists project_count int not null default 0;

alter table public.customer_profiles
  add column if not exists registration_type public.registration_type;

alter table public.customer_profiles
  add column if not exists has_concluded_project boolean not null default false;

alter table public.customer_profiles
  add column if not exists unlink_status public.unlink_status not null default 'none';

alter table public.customer_profiles
  add column if not exists unlink_reason text;

alter table public.customer_profiles
  add column if not exists unlink_submitted_at text;

alter table public.customer_profiles
  add column if not exists active_unlink_request_id uuid;

alter table public.customer_profiles
  add column if not exists profile_image text not null default '';

alter table public.customer_profiles
  add column if not exists admin_notes text;

alter table public.customer_profiles
  add column if not exists style_notes text not null default '';

alter table public.customer_profiles
  add column if not exists phone text not null default '';

alter table public.customer_profiles
  add column if not exists updated_at timestamptz not null default now();

alter table public.designer_customer_relationships
  add column if not exists registration_type public.registration_type not null default 'invited';

alter table public.designer_customer_relationships
  add column if not exists is_active boolean not null default true;

alter table public.designer_customer_relationships
  add column if not exists created_at timestamptz not null default now();

alter table public.invite_codes
  add column if not exists legacy_id text;

alter table public.invite_codes
  add column if not exists sent_ago text not null default '';

alter table public.invite_codes
  add column if not exists status public.invite_status not null default 'pending';

alter table public.invite_codes
  add column if not exists created_at timestamptz not null default now();

alter table public.projects
  add column if not exists legacy_id text;

alter table public.projects
  add column if not exists palette_id text not null default 'default';

alter table public.projects
  add column if not exists reference_images jsonb not null default '[]'::jsonb;

alter table public.projects
  add column if not exists customer_update text not null default '';

alter table public.projects
  add column if not exists designer_update text not null default '';

alter table public.projects
  add column if not exists internal_notes text not null default '';

alter table public.projects
  add column if not exists measurements jsonb;

alter table public.projects
  add column if not exists gallery_images jsonb;

alter table public.projects
  add column if not exists updated_at timestamptz not null default now();

alter table public.projects
  add column if not exists designer_fabric_advice text not null default '';

alter table public.customer_references
  add column if not exists legacy_id text;

alter table public.customer_references
  add column if not exists created_at timestamptz not null default now();

alter table public.messages
  add column if not exists legacy_id text;

alter table public.messages
  add column if not exists attachments jsonb;

alter table public.messages
  add column if not exists created_at timestamptz not null default now();

alter table public.marketplace_listings
  add column if not exists legacy_id text;

alter table public.marketplace_listings
  add column if not exists admin_notes text;

alter table public.marketplace_listings
  add column if not exists decline_reason text;

alter table public.marketplace_listings
  add column if not exists created_at timestamptz not null default now();

alter table public.portfolio_images
  add column if not exists sort_order int not null default 0;

alter table public.portfolio_images
  add column if not exists is_public boolean not null default true;

alter table public.portfolio_images
  add column if not exists created_at timestamptz not null default now();

alter table public.project_images
  add column if not exists image_type text not null default 'reference';

alter table public.project_images
  add column if not exists created_at timestamptz not null default now();

alter table public.unlink_requests
  add column if not exists legacy_id text;

alter table public.unlink_requests
  add column if not exists admin_notes text;

alter table public.unlink_requests
  add column if not exists admin_contacted_at text;

alter table public.unlink_requests
  add column if not exists designer_confirmation text;

alter table public.unlink_requests
  add column if not exists designer_response text;

alter table public.unlink_requests
  add column if not exists designer_responded_at text;

alter table public.unlink_requests
  add column if not exists created_at timestamptz not null default now();

alter table public.reports
  add column if not exists legacy_id text;

alter table public.reports
  add column if not exists reported_name text;

alter table public.reports
  add column if not exists priority text not null default 'Medium';

alter table public.reports
  add column if not exists detail text not null default '';

alter table public.reports
  add column if not exists created_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- Auth trigger: create public.users on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_name text;
  user_role public.user_role;
  customer_path text;
  requested_role text;
begin
  user_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  requested_role := lower(trim(coalesce(new.raw_user_meta_data->>'role', 'customer')));

  if requested_role = 'designer' then
    user_role := 'designer';
  else
    user_role := 'customer';
  end if;

  customer_path := new.raw_user_meta_data->>'customer_path';

  insert into public.users (id, email, name, role)
  values (new.id, new.email, user_name, user_role)
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        updated_at = now();

  if user_role = 'designer' then
    insert into public.designer_profiles (
      user_id, business_name, designer_name, location, specialty, bio, cover_image, profile_image
    )
    values (new.id, user_name || ' Atelier', user_name, '', 'Bespoke', '', '', '')
    on conflict (user_id) do nothing;
  elsif user_role = 'customer' then
    insert into public.customer_profiles (user_id, name, email, registration_type)
    values (
      new.id,
      user_name,
      new.email,
      case
        when customer_path = 'direct' then 'direct'::public.registration_type
        else 'invited'::public.registration_type
      end
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin';
$$;

create or replace function public.current_designer_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.designer_profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.current_customer_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.customer_profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.accept_customer_invite(invite_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_customer_id uuid;
  customer_email text;
  invite_row public.invite_codes%rowtype;
  normalized_code text;
begin
  normalized_code := upper(trim(invite_code));
  if normalized_code = '' then
    raise exception 'Invite code is required';
  end if;

  linked_customer_id := public.current_customer_profile_id();
  if linked_customer_id is null then
    raise exception 'Customer profile not found';
  end if;

  select email into customer_email
  from public.customer_profiles
  where id = linked_customer_id;

  select * into invite_row
  from public.invite_codes
  where code = normalized_code
    and status = 'pending'
  for update;

  if not found then
    return;
  end if;

  if customer_email not like '%@invite.local'
     and lower(customer_email) <> lower(invite_row.email) then
    raise exception 'This invitation was sent to a different email address';
  end if;

  insert into public.designer_customer_relationships (
    designer_id,
    customer_id,
    registration_type,
    is_active
  )
  values (
    invite_row.designer_id,
    linked_customer_id,
    'invited',
    true
  )
  on conflict (designer_id, customer_id) do update
    set registration_type = 'invited',
        is_active = true;

  update public.customer_profiles
  set registration_type = 'invited'
  where id = linked_customer_id;

  update public.invite_codes
  set status = 'accepted'
  where id = invite_row.id;
end;
$$;

revoke all on function public.accept_customer_invite(text) from public;
grant execute on function public.accept_customer_invite(text) to authenticated;

create or replace function public.apply_customer_measurement_submission(
  measurement_values jsonb,
  customer_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_profile_id uuid;
  project_row public.projects%rowtype;
  display_name text;
  advanced_to_design boolean;
  last_updated_label text;
begin
  customer_profile_id := public.current_customer_profile_id();
  if customer_profile_id is null then
    raise exception 'Customer profile not found';
  end if;

  select * into project_row
  from public.projects
  where customer_id = customer_profile_id
    and status <> 'Delivered'::public.project_status
  order by created_at desc
  limit 1
  for update;

  if not found then
    return null;
  end if;

  display_name := coalesce(
    nullif(trim(customer_display_name), ''),
    (select name from public.customer_profiles where id = customer_profile_id),
    'Your client'
  );

  advanced_to_design := project_row.status = 'Measurements Needed'::public.project_status;
  last_updated_label := trim(to_char(now(), 'FMDD')) || ' ' || trim(to_char(now(), 'Mon')) || ' ' || trim(to_char(now(), 'YYYY'));

  update public.projects
  set
    measurements = measurement_values,
    status = case
      when advanced_to_design then 'Design Confirmed'::public.project_status
      else project_row.status
    end,
    customer_update = case
      when advanced_to_design then 'Measurements received — your project is now in design review.'
      else 'Thank you — your measurements were received by your designer.'
    end,
    designer_update = display_name || ' submitted measurements — ready for design review.',
    last_updated = last_updated_label,
    updated_at = now()
  where id = project_row.id;

  return project_row.id;
end;
$$;

revoke all on function public.apply_customer_measurement_submission(jsonb, text) from public;
grant execute on function public.apply_customer_measurement_submission(jsonb, text) to authenticated;

create or replace function public.apply_customer_project_designer_update(
  designer_update_message text,
  project_key text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_profile_id uuid;
  project_row public.projects%rowtype;
  last_updated_label text;
begin
  if nullif(trim(designer_update_message), '') is null then
    return;
  end if;

  customer_profile_id := public.current_customer_profile_id();
  if customer_profile_id is null then
    raise exception 'Customer profile not found';
  end if;

  last_updated_label := trim(to_char(now(), 'FMDD')) || ' ' || trim(to_char(now(), 'Mon')) || ' ' || trim(to_char(now(), 'YYYY'));

  if project_key is not null and nullif(trim(project_key), '') is not null then
    select * into project_row
    from public.projects
    where customer_id = customer_profile_id
      and (legacy_id = trim(project_key) or id::text = trim(project_key))
    limit 1
    for update;
  else
    select * into project_row
    from public.projects
    where customer_id = customer_profile_id
      and status <> 'Delivered'::public.project_status
    order by created_at desc
    limit 1
    for update;
  end if;

  if not found then
    return;
  end if;

  update public.projects
  set
    designer_update = trim(designer_update_message),
    last_updated = last_updated_label,
    updated_at = now()
  where id = project_row.id;
end;
$$;

revoke all on function public.apply_customer_project_designer_update(text, text) from public;
grant execute on function public.apply_customer_project_designer_update(text, text) to authenticated;

create or replace function public.update_customer_fabric_selection(
  project_key text,
  primary_fabric text,
  secondary_material text,
  lining text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_profile_id uuid;
  project_row public.projects%rowtype;
  display_name text;
  last_updated_label text;
begin
  customer_profile_id := public.current_customer_profile_id();
  if customer_profile_id is null then
    raise exception 'Customer profile not found';
  end if;

  if nullif(trim(project_key), '') is null then
    raise exception 'Project is required';
  end if;

  select * into project_row
  from public.projects
  where customer_id = customer_profile_id
    and (legacy_id = trim(project_key) or id::text = trim(project_key))
  for update;

  if not found then
    raise exception 'Project not found';
  end if;

  if nullif(trim(primary_fabric), '') is null then
    raise exception 'Select a primary fabric';
  end if;
  if nullif(trim(lining), '') is null then
    raise exception 'Select a lining';
  end if;

  display_name := coalesce(
    (select name from public.customer_profiles where id = customer_profile_id),
    'Your client'
  );
  last_updated_label := trim(to_char(now(), 'FMDD')) || ' ' || trim(to_char(now(), 'Mon')) || ' ' || trim(to_char(now(), 'YYYY'));

  update public.projects
  set
    primary_fabric = trim(update_customer_fabric_selection.primary_fabric),
    secondary_material = coalesce(
      nullif(trim(update_customer_fabric_selection.secondary_material), ''),
      'None — primary fabric only'
    ),
    lining = trim(update_customer_fabric_selection.lining),
    customer_update = 'Fabric selections saved — your designer will review and advise.',
    designer_update = display_name || ' updated fabric selections.',
    last_updated = last_updated_label,
    updated_at = now()
  where id = project_row.id;
end;
$$;

revoke all on function public.update_customer_fabric_selection(text, text, text, text) from public;
grant execute on function public.update_customer_fabric_selection(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.user_preferences enable row level security;
alter table public.designer_profiles enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.designer_customer_relationships enable row level security;
alter table public.invite_codes enable row level security;
alter table public.projects enable row level security;
alter table public.customer_references enable row level security;
alter table public.measurements enable row level security;
alter table public.messages enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.portfolio_images enable row level security;
alter table public.project_images enable row level security;
alter table public.unlink_requests enable row level security;
alter table public.reports enable row level security;

-- Drop policies before recreate (safe to re-run schema.sql)
drop policy if exists "users_read_own_or_admin" on public.users;
drop policy if exists "users_update_own" on public.users;
drop policy if exists "users_admin_manage_team" on public.users;
drop policy if exists "user_preferences_read_own" on public.user_preferences;
drop policy if exists "user_preferences_upsert_own" on public.user_preferences;
drop policy if exists "designer_profiles_public_read_live" on public.designer_profiles;
drop policy if exists "designer_profiles_read_pending_invite" on public.designer_profiles;
drop policy if exists "designer_profiles_manage_own" on public.designer_profiles;
drop policy if exists "designer_profiles_admin_update" on public.designer_profiles;
drop policy if exists "customer_profiles_read_linked_or_own" on public.customer_profiles;
drop policy if exists "customer_profiles_manage_own" on public.customer_profiles;
drop policy if exists "relationships_read_participants" on public.designer_customer_relationships;
drop policy if exists "relationships_manage_designer" on public.designer_customer_relationships;
drop policy if exists "relationships_customer_marketplace_insert" on public.designer_customer_relationships;
drop policy if exists "relationships_customer_marketplace_update" on public.designer_customer_relationships;
drop policy if exists "invites_designer_manage" on public.invite_codes;
drop policy if exists "invites_read_by_code" on public.invite_codes;
drop policy if exists "projects_read_participants" on public.projects;
drop policy if exists "projects_manage_designer" on public.projects;
drop policy if exists "projects_insert_customer_enquiry" on public.projects;
drop policy if exists "references_read_project_participants" on public.customer_references;
drop policy if exists "references_manage_customer" on public.customer_references;
drop policy if exists "measurements_read_own_or_designer" on public.measurements;
drop policy if exists "measurements_manage_own" on public.measurements;
drop policy if exists "messages_read_project_participants" on public.messages;
drop policy if exists "messages_insert_participants" on public.messages;
drop policy if exists "marketplace_read_all" on public.marketplace_listings;
drop policy if exists "marketplace_designer_insert" on public.marketplace_listings;
drop policy if exists "marketplace_admin_update" on public.marketplace_listings;
drop policy if exists "portfolio_public_read" on public.portfolio_images;
drop policy if exists "portfolio_designer_manage" on public.portfolio_images;
drop policy if exists "project_images_read_participants" on public.project_images;
drop policy if exists "project_images_manage_participants" on public.project_images;
drop policy if exists "unlink_read_participants" on public.unlink_requests;
drop policy if exists "unlink_customer_insert" on public.unlink_requests;
drop policy if exists "unlink_admin_designer_update" on public.unlink_requests;
drop policy if exists "reports_admin_all" on public.reports;
drop policy if exists "reports_user_insert" on public.reports;

-- Users
create policy "users_read_own_or_admin" on public.users for select using (
  id = auth.uid() or public.is_admin()
);
create policy "users_update_own" on public.users for update using (id = auth.uid());
create policy "users_admin_manage_team" on public.users
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "user_preferences_read_own" on public.user_preferences
  for select using (user_id = auth.uid());

create policy "user_preferences_upsert_own" on public.user_preferences
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Prevent non-admins from self-promoting via profile updates.
create or replace function public.enforce_user_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Only admins can change user roles';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_user_role_change on public.users;
create trigger enforce_user_role_change
  before update on public.users
  for each row
  execute function public.enforce_user_role_change();

create or replace function public.enforce_user_account_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.account_status is distinct from new.account_status and not public.is_admin() then
    raise exception 'Only admins can change account status';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_user_account_status_change on public.users;
create trigger enforce_user_account_status_change
  before update on public.users
  for each row
  execute function public.enforce_user_account_status_change();

-- Designer profiles
create policy "designer_profiles_public_read_live" on public.designer_profiles for select using (
  marketplace_live = true or user_id = auth.uid() or public.is_admin()
  or exists (
    select 1 from public.designer_customer_relationships r
    join public.customer_profiles c on c.id = r.customer_id
    where r.designer_id = designer_profiles.id and c.user_id = auth.uid() and r.is_active
  )
);
create policy "designer_profiles_read_pending_invite" on public.designer_profiles for select using (
  exists (
    select 1 from public.invite_codes ic
    where ic.designer_id = designer_profiles.id and ic.status = 'pending'
  )
);
create policy "designer_profiles_manage_own" on public.designer_profiles for all using (
  user_id = auth.uid() or public.is_admin()
);

-- Customer profiles
create policy "customer_profiles_read_linked_or_own" on public.customer_profiles for select using (
  user_id = auth.uid() or public.is_admin()
  or exists (
    select 1 from public.designer_customer_relationships r
    where r.customer_id = customer_profiles.id
      and r.designer_id = public.current_designer_profile_id()
      and r.is_active
  )
);
create policy "customer_profiles_manage_own" on public.customer_profiles for all using (
  user_id = auth.uid() or public.is_admin()
);

-- Relationships
create policy "relationships_read_participants" on public.designer_customer_relationships for select using (
  public.is_admin()
  or designer_id = public.current_designer_profile_id()
  or customer_id = public.current_customer_profile_id()
);
create policy "relationships_manage_designer" on public.designer_customer_relationships for all using (
  designer_id = public.current_designer_profile_id() or public.is_admin()
);
create policy "relationships_customer_marketplace_insert" on public.designer_customer_relationships
  for insert with check (
    customer_id = public.current_customer_profile_id()
    and registration_type = 'direct'
    and exists (
      select 1
      from public.designer_profiles d
      where d.id = designer_id
        and d.marketplace_live = true
    )
  );
create policy "relationships_customer_marketplace_update" on public.designer_customer_relationships
  for update using (
    customer_id = public.current_customer_profile_id()
  ) with check (
    customer_id = public.current_customer_profile_id()
    and exists (
      select 1
      from public.designer_profiles d
      where d.id = designer_id
        and d.marketplace_live = true
    )
  );

-- Invite codes
create policy "invites_designer_manage" on public.invite_codes for all using (
  designer_id = public.current_designer_profile_id() or public.is_admin()
);

create or replace function public.lookup_invite_code(invite_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  invite_row public.invite_codes%rowtype;
  designer_row public.designer_profiles%rowtype;
begin
  normalized := upper(trim(invite_code));
  if normalized = '' then
    return null;
  end if;

  select * into invite_row
  from public.invite_codes
  where code = normalized;

  if not found then
    return null;
  end if;

  select * into designer_row
  from public.designer_profiles
  where id = invite_row.designer_id;

  return json_build_object(
    'id', invite_row.id,
    'legacy_id', invite_row.legacy_id,
    'code', invite_row.code,
    'name', invite_row.name,
    'project_type', invite_row.project_type,
    'sent_at', invite_row.sent_at,
    'sent_ago', invite_row.sent_ago,
    'status', invite_row.status,
    'designer_name', coalesce(designer_row.designer_name, designer_row.business_name, 'Your designer'),
    'business_name', coalesce(designer_row.business_name, ''),
    'designer_legacy_id', coalesce(designer_row.legacy_id, designer_row.id::text)
  );
end;
$$;

revoke all on function public.lookup_invite_code(text) from public;
grant execute on function public.lookup_invite_code(text) to anon, authenticated;

-- Projects
create policy "projects_read_participants" on public.projects for select using (
  public.is_admin()
  or designer_id = public.current_designer_profile_id()
  or customer_id = public.current_customer_profile_id()
);
create policy "projects_manage_designer" on public.projects for all using (
  designer_id = public.current_designer_profile_id() or public.is_admin()
);
create policy "projects_insert_customer_enquiry" on public.projects
  for insert with check (
    customer_id = public.current_customer_profile_id()
    and status = 'Enquiry'
    and exists (
      select 1
      from public.designer_customer_relationships r
      where r.customer_id = projects.customer_id
        and r.designer_id = projects.designer_id
        and r.is_active = true
    )
  );

-- Customer references
create policy "references_read_project_participants" on public.customer_references for select using (
  exists (
    select 1 from public.projects p
    where p.id = customer_references.project_id
      and (
        p.designer_id = public.current_designer_profile_id()
        or p.customer_id = public.current_customer_profile_id()
        or public.is_admin()
      )
  )
);
create policy "references_manage_customer" on public.customer_references for all using (
  exists (
    select 1 from public.projects p
    where p.id = customer_references.project_id
      and p.customer_id = public.current_customer_profile_id()
  ) or public.is_admin()
);

-- Measurements
create policy "measurements_read_own_or_designer" on public.measurements for select using (
  public.is_admin()
  or customer_id = public.current_customer_profile_id()
  or exists (
    select 1 from public.designer_customer_relationships r
    where r.customer_id = measurements.customer_id
      and r.designer_id = public.current_designer_profile_id()
      and r.is_active
  )
);
create policy "measurements_manage_own" on public.measurements for all using (
  customer_id = public.current_customer_profile_id() or public.is_admin()
);

-- Messages
create policy "messages_read_project_participants" on public.messages for select using (
  exists (
    select 1 from public.projects p
    where p.id = messages.project_id
      and (
        p.designer_id = public.current_designer_profile_id()
        or p.customer_id = public.current_customer_profile_id()
        or public.is_admin()
      )
  )
);
create policy "messages_insert_participants" on public.messages for insert with check (
  exists (
    select 1 from public.projects p
    where p.id = messages.project_id
      and (
        p.designer_id = public.current_designer_profile_id()
        or p.customer_id = public.current_customer_profile_id()
      )
  ) or public.is_admin()
);

-- Marketplace listings
create policy "marketplace_read_all" on public.marketplace_listings for select using (true);
create policy "marketplace_designer_insert" on public.marketplace_listings for insert with check (
  designer_id = public.current_designer_profile_id()
);
create policy "marketplace_admin_update" on public.marketplace_listings for update using (
  public.is_admin() or designer_id = public.current_designer_profile_id()
);

-- Portfolio images
create policy "portfolio_public_read" on public.portfolio_images for select using (
  is_public or exists (
    select 1 from public.designer_profiles d
    where d.id = portfolio_images.designer_id and d.user_id = auth.uid()
  ) or public.is_admin()
);
create policy "portfolio_designer_manage" on public.portfolio_images for all using (
  exists (
    select 1 from public.designer_profiles d
    where d.id = portfolio_images.designer_id and d.user_id = auth.uid()
  ) or public.is_admin()
);

-- Project images
create policy "project_images_read_participants" on public.project_images for select using (
  exists (
    select 1 from public.projects p
    where p.id = project_images.project_id
      and (
        p.designer_id = public.current_designer_profile_id()
        or p.customer_id = public.current_customer_profile_id()
        or public.is_admin()
      )
  )
);
create policy "project_images_manage_participants" on public.project_images for all using (
  exists (
    select 1 from public.projects p
    where p.id = project_images.project_id
      and (
        p.designer_id = public.current_designer_profile_id()
        or p.customer_id = public.current_customer_profile_id()
        or public.is_admin()
      )
  )
);

-- Unlink requests
create policy "unlink_read_participants" on public.unlink_requests for select using (
  public.is_admin()
  or designer_id = public.current_designer_profile_id()
  or customer_id = public.current_customer_profile_id()
);
create policy "unlink_customer_insert" on public.unlink_requests for insert with check (
  customer_id = public.current_customer_profile_id()
);
create policy "unlink_admin_designer_update" on public.unlink_requests for update using (
  public.is_admin() or designer_id = public.current_designer_profile_id()
);

-- Reports
create policy "reports_admin_all" on public.reports for all using (public.is_admin());
create policy "reports_user_insert" on public.reports for insert with check (reporter_id = auth.uid());

-- Realtime (live messaging + project timeline)
do $$
declare
  table_name text;
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'projects'
  ) then
    alter publication supabase_realtime add table public.projects;
  end if;

  foreach table_name in array array[
    'unlink_requests',
    'marketplace_listings',
    'reports',
    'designer_profiles',
    'customer_profiles',
    'designer_customer_relationships',
    'invite_codes'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage buckets (run in dashboard or storage policies separately)
-- ---------------------------------------------------------------------------
-- avatars, designer-portfolios, project-references, project-progress,
-- customer-inspiration, measurement-guides
