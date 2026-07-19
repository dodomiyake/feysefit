-- Post-delivery confirmation, issue reporting, and project completion flow.
-- Run after schema.sql. Safe to run before or after patch-testimonials.sql
-- (enum values and testimonial policies are idempotent in both files).

do $$ begin
  alter type public.project_status add value 'Awaiting Customer Confirmation';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.project_status add value 'Completed';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.project_status add value 'Issue Reported';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.project_status add value 'Adjustment Needed';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.project_status add value 'Re-delivered';
exception when duplicate_object then null;
end $$;

update public.projects
set status = 'Awaiting Customer Confirmation'::public.project_status
where status = 'Delivered'::public.project_status;

do $$ begin
  create type public.delivery_issue_type as enum (
    'fitting_problem',
    'wrong_measurement',
    'wrong_fabric',
    'wrong_design_detail',
    'damaged_item',
    'missing_item',
    'delivery_issue',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.delivery_issue_status as enum ('open', 'in_progress', 'resolved');
exception when duplicate_object then null;
end $$;

create table if not exists public.project_delivery_issues (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  project_id uuid not null references public.projects (id) on delete cascade,
  customer_id uuid not null references public.customer_profiles (id) on delete cascade,
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  issue_type public.delivery_issue_type not null,
  detail text not null default '',
  status public.delivery_issue_status not null default 'open',
  designer_response text not null default '',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists delivered_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists delivery_confirmed_at timestamptz;

create index if not exists project_delivery_issues_project_id_idx
  on public.project_delivery_issues (project_id);

create index if not exists project_delivery_issues_designer_id_idx
  on public.project_delivery_issues (designer_id);

create index if not exists project_delivery_issues_status_idx
  on public.project_delivery_issues (status);

create or replace function public.touch_delivery_issue_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists project_delivery_issues_touch_updated_at on public.project_delivery_issues;
create trigger project_delivery_issues_touch_updated_at
before update on public.project_delivery_issues
for each row execute function public.touch_delivery_issue_updated_at();

create or replace function public.project_is_active_for_customer(target_status public.project_status)
returns boolean
language sql
immutable
as $$
  select target_status not in (
    'Completed'::public.project_status
  );
$$;

alter table public.project_delivery_issues enable row level security;

drop policy if exists "delivery_issues_customer_read" on public.project_delivery_issues;
create policy "delivery_issues_customer_read" on public.project_delivery_issues
for select using (
  exists (
    select 1 from public.customer_profiles cp
    where cp.id = project_delivery_issues.customer_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "delivery_issues_designer_read" on public.project_delivery_issues;
create policy "delivery_issues_designer_read" on public.project_delivery_issues
for select using (
  exists (
    select 1 from public.designer_profiles dp
    where dp.id = project_delivery_issues.designer_id
      and dp.user_id = auth.uid()
  )
);

drop policy if exists "delivery_issues_customer_insert" on public.project_delivery_issues;
create policy "delivery_issues_customer_insert" on public.project_delivery_issues
for insert with check (
  exists (
    select 1
    from public.customer_profiles cp
    join public.projects p on p.id = project_delivery_issues.project_id
    where cp.id = project_delivery_issues.customer_id
      and cp.user_id = auth.uid()
      and p.status in (
        'Awaiting Customer Confirmation'::public.project_status,
        'Delivered'::public.project_status,
        'Re-delivered'::public.project_status
      )
      and (p.customer_id = cp.id or p.customer_name = cp.name)
  )
);

drop policy if exists "delivery_issues_designer_update" on public.project_delivery_issues;
create policy "delivery_issues_designer_update" on public.project_delivery_issues
for update using (
  exists (
    select 1 from public.designer_profiles dp
    where dp.id = project_delivery_issues.designer_id
      and dp.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.designer_profiles dp
    where dp.id = project_delivery_issues.designer_id
      and dp.user_id = auth.uid()
  )
);

drop policy if exists "delivery_issues_admin_all" on public.project_delivery_issues;
create policy "delivery_issues_admin_all" on public.project_delivery_issues
for all using (public.is_admin()) with check (public.is_admin());

-- Testimonials require Completed (not just delivered).
create or replace function public.recompute_designer_testimonial_stats(target_designer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  avg_rating numeric;
  review_total int;
begin
  select
    coalesce(round(avg(t.rating)::numeric, 1), 0),
    count(*)::int
  into avg_rating, review_total
  from public.testimonials t
  join public.projects p on p.id = t.project_id
  where t.designer_id = target_designer_id
    and t.allow_public = true
    and t.status = 'active'
    and p.status = 'Completed'::public.project_status;

  update public.designer_profiles
  set rating = avg_rating,
      review_count = review_total
  where id = target_designer_id;
end;
$$;

drop policy if exists "testimonials_customer_insert" on public.testimonials;
create policy "testimonials_customer_insert" on public.testimonials
for insert with check (
  exists (
    select 1
    from public.customer_profiles cp
    join public.projects p on p.id = testimonials.project_id
    where cp.id = testimonials.customer_id
      and cp.user_id = auth.uid()
      and p.status = 'Completed'::public.project_status
      and (
        p.customer_id = cp.id
        or p.customer_name = cp.name
      )
  )
);
