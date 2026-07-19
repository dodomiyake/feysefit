-- FeyseFit database bootstrap (tables + column patches, no RLS)
-- NEW PROJECT: run supabase/schema.sql instead (full install in one file).
-- Use this only if you ran patch files on an empty DB, or need tables before re-running schema.sql.
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

-- ---------------------------------------------------------------------------
-- Users (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null,
  role public.user_role not null default 'customer',
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
  email text not null,
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
-- Designer â†” Customer relationships
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
  internal_notes text not null default '',
  measurements jsonb,
  gallery_images jsonb,
  primary_fabric text,
  secondary_material text,
  lining text,
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

alter table public.designer_profiles
  add column if not exists legacy_id text;

alter table public.designer_profiles
  add column if not exists marketplace_live boolean not null default false;

alter table public.designer_profiles
  add column if not exists cover_image text not null default '';

alter table public.designer_profiles
  add column if not exists profile_image text not null default '';

alter table public.designer_profiles
  add column if not exists rating numeric(3, 2) not null default 0;

alter table public.designer_profiles
  add column if not exists review_count int not null default 0;

alter table public.designer_profiles
  add column if not exists updated_at timestamptz not null default now();

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
  add column if not exists internal_notes text not null default '';

alter table public.projects
  add column if not exists measurements jsonb;

alter table public.projects
  add column if not exists gallery_images jsonb;

alter table public.projects
  add column if not exists updated_at timestamptz not null default now();

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

-- ---------------------------------------------------------------------------
-- Enable RLS on bootstrap-created tables (policies come from schema.sql)
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
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
