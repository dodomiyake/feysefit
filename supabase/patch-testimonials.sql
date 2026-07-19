-- Testimonials and review moderation for completed projects.
-- Run after schema.sql and project patches.
--
-- Adds project_status enum values required for the post-delivery flow.
-- If you already ran patch-post-delivery-flow.sql, these blocks are no-ops.

do $$ begin
  alter type public.project_status add value 'Awaiting Customer Confirmation';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter type public.project_status add value 'Completed';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter type public.project_status add value 'Issue Reported';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter type public.project_status add value 'Adjustment Needed';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.testimonial_status as enum ('active', 'hidden_by_designer', 'removed_by_admin');
exception when duplicate_object then null;
end $$;

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  project_id uuid not null unique references public.projects (id) on delete cascade,
  customer_id uuid not null references public.customer_profiles (id) on delete cascade,
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text not null,
  outfit_type text not null default '',
  photo_url text not null default '',
  allow_public boolean not null default false,
  show_name boolean not null default false,
  show_location boolean not null default false,
  display_name text not null default 'Client',
  display_location text not null default '',
  private_feedback text not null default '',
  status public.testimonial_status not null default 'active',
  request_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testimonial_reports (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  testimonial_id uuid not null references public.testimonials (id) on delete cascade,
  reporter_id uuid not null references public.users (id) on delete cascade,
  reason text not null,
  detail text not null default '',
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists testimonial_requested_at timestamptz;

create index if not exists testimonials_designer_id_idx on public.testimonials (designer_id);
create index if not exists testimonials_customer_id_idx on public.testimonials (customer_id);
create index if not exists testimonial_reports_status_idx on public.testimonial_reports (status);

create or replace function public.touch_testimonial_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists testimonials_touch_updated_at on public.testimonials;
create trigger testimonials_touch_updated_at
before update on public.testimonials
for each row execute function public.touch_testimonial_updated_at();

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

create or replace function public.after_testimonial_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_designer_testimonial_stats(old.designer_id);
    return old;
  end if;

  perform public.recompute_designer_testimonial_stats(new.designer_id);
  if tg_op = 'UPDATE' and old.designer_id is distinct from new.designer_id then
    perform public.recompute_designer_testimonial_stats(old.designer_id);
  end if;
  return new;
end;
$$;

drop trigger if exists testimonials_recompute_designer_stats on public.testimonials;
create trigger testimonials_recompute_designer_stats
after insert or update or delete on public.testimonials
for each row execute function public.after_testimonial_change();

alter table public.testimonials enable row level security;
alter table public.testimonial_reports enable row level security;

drop policy if exists "testimonials_public_read" on public.testimonials;
create policy "testimonials_public_read" on public.testimonials
for select using (
  allow_public = true
  and status = 'active'
);

drop policy if exists "testimonials_customer_read_own" on public.testimonials;
create policy "testimonials_customer_read_own" on public.testimonials
for select using (
  exists (
    select 1
    from public.customer_profiles cp
    where cp.id = testimonials.customer_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "testimonials_designer_read" on public.testimonials;
create policy "testimonials_designer_read" on public.testimonials
for select using (
  exists (
    select 1
    from public.designer_profiles dp
    where dp.id = testimonials.designer_id
      and dp.user_id = auth.uid()
  )
);

drop policy if exists "testimonials_admin_all" on public.testimonials;
create policy "testimonials_admin_all" on public.testimonials
for all using (public.is_admin()) with check (public.is_admin());

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

drop policy if exists "testimonials_designer_hide" on public.testimonials;
create policy "testimonials_designer_hide" on public.testimonials
for update using (
  exists (
    select 1
    from public.designer_profiles dp
    where dp.id = testimonials.designer_id
      and dp.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.designer_profiles dp
    where dp.id = testimonials.designer_id
      and dp.user_id = auth.uid()
  )
);

drop policy if exists "testimonial_reports_designer_insert" on public.testimonial_reports;
create policy "testimonial_reports_designer_insert" on public.testimonial_reports
for insert with check (
  reporter_id = auth.uid()
  and exists (
    select 1
    from public.testimonials t
    join public.designer_profiles dp on dp.id = t.designer_id
    where t.id = testimonial_reports.testimonial_id
      and dp.user_id = auth.uid()
  )
);

drop policy if exists "testimonial_reports_designer_read_own" on public.testimonial_reports;
create policy "testimonial_reports_designer_read_own" on public.testimonial_reports
for select using (reporter_id = auth.uid());

drop policy if exists "testimonial_reports_admin_all" on public.testimonial_reports;
create policy "testimonial_reports_admin_all" on public.testimonial_reports
for all using (public.is_admin()) with check (public.is_admin());
