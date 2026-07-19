-- Ensure Row Level Security is enabled on every FeyseFit user-data table.
-- Safe to re-run. Does not create policies (those live in schema.sql / feature patches).
-- Run in Supabase SQL Editor after schema/bootstrap and feature patches.

do $$
declare
  tbl text;
  tables text[] := array[
    'users',
    'user_preferences',
    'designer_profiles',
    'customer_profiles',
    'designer_customer_relationships',
    'invite_codes',
    'projects',
    'customer_references',
    'measurements',
    'messages',
    'marketplace_listings',
    'portfolio_images',
    'project_images',
    'unlink_requests',
    'reports',
    'testimonials',
    'testimonial_reports',
    'project_delivery_issues',
    'studio_clients',
    'studio_appointments',
    'group_projects',
    'group_project_members',
    'designer_availability_windows',
    'designer_availability_dates'
  ];
begin
  foreach tbl in array tables loop
    if to_regclass('public.' || tbl) is not null then
      execute format('alter table public.%I enable row level security', tbl);
      -- Force RLS even for table owners (extra hardening in Supabase).
      execute format('alter table public.%I force row level security', tbl);
    end if;
  end loop;
end $$;

-- Quick check: any public base table still without RLS?
-- select c.relname, c.relrowsecurity, c.relforcerowsecurity
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relkind = 'r'
-- order by 1;
