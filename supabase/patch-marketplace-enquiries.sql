-- FeyseFit marketplace enquiries
-- Apply after patch-security-audit-followup-4.sql.
-- A marketplace enquiry is intentionally separate from a relationship and project.

begin;

create table if not exists public.marketplace_enquiries (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  customer_id uuid not null references public.customer_profiles (id) on delete cascade,
  designer_name text not null,
  customer_name text not null,
  outfit_type text not null,
  description text not null,
  budget text,
  preferred_deadline date,
  consultation_preference text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  designer_response text,
  project_id uuid references public.projects (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  declined_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(outfit_type) between 1 and 120),
  check (char_length(description) between 10 and 4000),
  check (budget is null or char_length(budget) <= 120),
  check (consultation_preference is null or char_length(consultation_preference) <= 120),
  check (designer_response is null or char_length(designer_response) <= 1000)
);

create index if not exists marketplace_enquiries_customer_created_idx
  on public.marketplace_enquiries (customer_id, created_at desc);
create index if not exists marketplace_enquiries_designer_created_idx
  on public.marketplace_enquiries (designer_id, created_at desc);
create unique index if not exists marketplace_enquiries_one_pending_pair_idx
  on public.marketplace_enquiries (customer_id, designer_id)
  where status = 'pending';
create unique index if not exists marketplace_enquiries_project_unique_idx
  on public.marketplace_enquiries (project_id)
  where project_id is not null;

alter table public.marketplace_enquiries enable row level security;
alter table public.marketplace_enquiries force row level security;

revoke all on table public.marketplace_enquiries from public, anon, authenticated;
grant select on table public.marketplace_enquiries to authenticated;

drop policy if exists marketplace_enquiries_read_participants
  on public.marketplace_enquiries;
create policy marketplace_enquiries_read_participants
on public.marketplace_enquiries
for select
to authenticated
using (
  customer_id = public.current_customer_profile_id()
  or designer_id = public.current_designer_profile_id()
  or public.is_admin()
);

create or replace function app_private.set_marketplace_enquiry_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

revoke all on function app_private.set_marketplace_enquiry_updated_at()
  from public, anon, authenticated;

drop trigger if exists trg_marketplace_enquiries_updated_at
  on public.marketplace_enquiries;
create trigger trg_marketplace_enquiries_updated_at
before update on public.marketplace_enquiries
for each row execute function app_private.set_marketplace_enquiry_updated_at();

create or replace function public.create_marketplace_enquiry(
  p_designer_id uuid,
  p_outfit_type text,
  p_description text,
  p_budget text default null,
  p_preferred_deadline date default null,
  p_consultation_preference text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_customer_id uuid := public.current_customer_profile_id();
  v_customer_name text;
  v_designer_name text;
  v_enquiry_id uuid;
  v_pending_count integer;
begin
  if auth.uid() is null or v_customer_id is null then
    raise exception 'customer account required' using errcode = '42501';
  end if;

  if app_private.consume_rate_limit(
    'design_request', app_private.uid_rate_limit_bucket()
  ) is distinct from true then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if p_designer_id is null
     or char_length(trim(coalesce(p_outfit_type, ''))) not between 1 and 120
     or char_length(trim(coalesce(p_description, ''))) not between 10 and 4000
     or char_length(trim(coalesce(p_budget, ''))) > 120
     or char_length(trim(coalesce(p_consultation_preference, ''))) > 120 then
    raise exception 'invalid enquiry';
  end if;

  select c.name into v_customer_name
  from public.customer_profiles c
  where c.id = v_customer_id;

  select d.business_name into v_designer_name
  from public.designer_profiles d
  where d.id = p_designer_id
    and d.marketplace_live = true
    and exists (
      select 1
      from public.marketplace_listings ml
      where ml.designer_id = d.id
        and ml.status = 'approved'
    );

  if v_designer_name is null then
    raise exception 'designer is not accepting marketplace enquiries';
  end if;

  if exists (
    select 1 from public.marketplace_enquiries e
    where e.customer_id = v_customer_id
      and e.designer_id = p_designer_id
      and e.status = 'pending'
      and e.expires_at > clock_timestamp()
  ) then
    raise exception 'an enquiry with this designer is already pending';
  end if;

  update public.marketplace_enquiries
  set status = 'expired'
  where customer_id = v_customer_id
    and status = 'pending'
    and expires_at <= clock_timestamp();

  select count(*)::integer into v_pending_count
  from public.marketplace_enquiries e
  where e.customer_id = v_customer_id
    and e.status = 'pending'
    and e.expires_at > clock_timestamp();

  if v_pending_count >= 3 then
    raise exception 'pending enquiry limit reached';
  end if;

  insert into public.marketplace_enquiries (
    designer_id, customer_id, designer_name, customer_name, outfit_type,
    description, budget, preferred_deadline, consultation_preference
  ) values (
    p_designer_id,
    v_customer_id,
    v_designer_name,
    v_customer_name,
    trim(p_outfit_type),
    trim(p_description),
    nullif(trim(coalesce(p_budget, '')), ''),
    p_preferred_deadline,
    nullif(trim(coalesce(p_consultation_preference, '')), '')
  ) returning id into v_enquiry_id;

  return v_enquiry_id;
end;
$$;

revoke all on function public.create_marketplace_enquiry(
  uuid, text, text, text, date, text
) from public, anon;
grant execute on function public.create_marketplace_enquiry(
  uuid, text, text, text, date, text
) to authenticated;

create or replace function public.respond_to_marketplace_enquiry(
  p_enquiry_id uuid,
  p_decision text,
  p_response text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_enquiry public.marketplace_enquiries%rowtype;
  v_designer_id uuid := public.current_designer_profile_id();
  v_decision text := lower(trim(coalesce(p_decision, '')));
begin
  if auth.uid() is null or v_designer_id is null then
    raise exception 'designer account required' using errcode = '42501';
  end if;
  if v_decision not in ('accepted', 'declined')
     or char_length(trim(coalesce(p_response, ''))) > 1000 then
    raise exception 'invalid response';
  end if;

  select * into v_enquiry
  from public.marketplace_enquiries
  where id = p_enquiry_id
  for update;

  if not found or v_enquiry.designer_id <> v_designer_id then
    raise exception 'enquiry not found' using errcode = '42501';
  end if;
  if v_enquiry.status <> 'pending' then
    raise exception 'enquiry is no longer pending';
  end if;
  if v_enquiry.expires_at <= clock_timestamp() then
    update public.marketplace_enquiries
    set status = 'expired'
    where id = v_enquiry.id;
    return;
  end if;

  if v_decision = 'accepted' then
    insert into public.designer_customer_relationships (
      designer_id, customer_id, registration_type, is_active
    ) values (
      v_enquiry.designer_id, v_enquiry.customer_id, 'direct', true
    )
    on conflict (designer_id, customer_id) do update
      set registration_type = 'direct', is_active = true;

    update public.marketplace_enquiries
    set status = 'accepted',
        designer_response = nullif(trim(coalesce(p_response, '')), ''),
        accepted_at = clock_timestamp()
    where id = v_enquiry.id;
  else
    update public.marketplace_enquiries
    set status = 'declined',
        designer_response = nullif(trim(coalesce(p_response, '')), ''),
        declined_at = clock_timestamp()
    where id = v_enquiry.id;
  end if;
end;
$$;

revoke all on function public.respond_to_marketplace_enquiry(uuid, text, text)
  from public, anon;
grant execute on function public.respond_to_marketplace_enquiry(uuid, text, text)
  to authenticated;

create or replace function public.cancel_marketplace_enquiry(p_enquiry_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_customer_id uuid := public.current_customer_profile_id();
begin
  if auth.uid() is null or v_customer_id is null then
    raise exception 'customer account required' using errcode = '42501';
  end if;

  update public.marketplace_enquiries
  set status = 'cancelled', cancelled_at = clock_timestamp()
  where id = p_enquiry_id
    and customer_id = v_customer_id
    and status = 'pending';

  if not found then
    raise exception 'pending enquiry not found';
  end if;
end;
$$;

revoke all on function public.cancel_marketplace_enquiry(uuid) from public, anon;
grant execute on function public.cancel_marketplace_enquiry(uuid) to authenticated;

create or replace function public.create_project_from_marketplace_enquiry(
  p_enquiry_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_designer_id uuid := public.current_designer_profile_id();
  v_enquiry public.marketplace_enquiries%rowtype;
  v_project_id uuid;
  v_project_title text;
  v_deadline text;
  v_budget text;
begin
  if auth.uid() is null or v_designer_id is null then
    raise exception 'designer account required' using errcode = '42501';
  end if;

  select * into v_enquiry
  from public.marketplace_enquiries
  where id = p_enquiry_id
  for update;

  if not found or v_enquiry.designer_id <> v_designer_id then
    raise exception 'enquiry not found' using errcode = '42501';
  end if;
  if v_enquiry.status <> 'accepted' then
    raise exception 'enquiry must be accepted before creating a project';
  end if;
  if v_enquiry.project_id is not null then
    return v_enquiry.project_id;
  end if;
  if not exists (
    select 1
    from public.designer_customer_relationships r
    where r.designer_id = v_enquiry.designer_id
      and r.customer_id = v_enquiry.customer_id
      and r.is_active = true
  ) then
    raise exception 'active relationship required' using errcode = '42501';
  end if;

  v_project_id := gen_random_uuid();
  v_project_title := v_enquiry.outfit_type || ' — ' || v_enquiry.customer_name;
  v_deadline := coalesce(to_char(v_enquiry.preferred_deadline, 'DD Mon YYYY'), 'TBD');
  v_budget := coalesce(v_enquiry.budget, 'TBD');

  insert into public.projects (
    id, project_code, title, customer_name, customer_id, designer_id,
    outfit_type, deadline, budget, description, status, customer_update,
    internal_notes, started_date, last_updated, updated_at
  ) values (
    v_project_id,
    'FF-' || upper(substr(replace(v_project_id::text, '-', ''), 1, 8)),
    v_project_title,
    v_enquiry.customer_name,
    v_enquiry.customer_id,
    v_enquiry.designer_id,
    v_enquiry.outfit_type,
    v_deadline,
    v_budget,
    v_enquiry.description,
    'Enquiry',
    'Your designer accepted the enquiry and created this project.',
    'Created from marketplace enquiry ' || v_enquiry.id::text || '.',
    to_char(current_date, 'DD Mon YYYY'),
    'Just now',
    clock_timestamp()
  );

  insert into public.project_items (
    project_id, sort_order, title, outfit_type, description, status,
    deadline, price, internal_notes
  ) values (
    v_project_id, 0, v_project_title, v_enquiry.outfit_type,
    v_enquiry.description, 'Enquiry', v_deadline, v_budget,
    'Created from marketplace enquiry ' || v_enquiry.id::text || '.'
  );

  update public.marketplace_enquiries
  set project_id = v_project_id
  where id = v_enquiry.id;

  return v_project_id;
end;
$$;

revoke all on function public.create_project_from_marketplace_enquiry(uuid)
  from public, anon;
grant execute on function public.create_project_from_marketplace_enquiry(uuid)
  to authenticated;

-- Customers may no longer self-activate relationships. Acceptance or an invite
-- is the trust boundary that creates the link.
drop policy if exists relationships_customer_marketplace_insert
  on public.designer_customer_relationships;
drop policy if exists relationships_customer_marketplace_update
  on public.designer_customer_relationships;
revoke insert, update on public.designer_customer_relationships from public, anon, authenticated;

-- Retire the previous immediate-link marketplace RPC when the legacy patch is present.
do $$
begin
  if to_regprocedure('public.link_customer_to_marketplace_designer(uuid)') is not null then
    execute 'revoke execute on function public.link_customer_to_marketplace_designer(uuid) from public, anon, authenticated';
  end if;
end $$;

-- Unlink approval is relationship-scoped. It must never deactivate a client's
-- other designer relationships.
create or replace function public.approve_customer_unlink(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_customer_id uuid;
  v_designer_id uuid;
  v_blocking_count integer;
begin
  if auth.uid() is null or not public.is_admin_aal2() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select customer_id, designer_id
  into v_customer_id, v_designer_id
  from public.unlink_requests
  where id = p_request_id
  for update;

  if v_customer_id is null or v_designer_id is null then
    raise exception 'unlink request not found';
  end if;

  select count(*)::integer into v_blocking_count
  from public.projects p
  where p.customer_id = v_customer_id
    and p.designer_id = v_designer_id
    and public.project_status_blocks_unlink(p.status)
    and not public.is_messaging_shell_project(p.title, p.outfit_type, p.status);

  if v_blocking_count > 0 then
    raise exception 'cannot approve unlink while active projects remain';
  end if;

  update public.unlink_requests set status = 'approved' where id = p_request_id;
  update public.projects
  set relationship_archived_at = coalesce(relationship_archived_at, clock_timestamp())
  where customer_id = v_customer_id and designer_id = v_designer_id;
  update public.designer_customer_relationships
  set is_active = false
  where customer_id = v_customer_id
    and designer_id = v_designer_id
    and is_active = true;
end;
$$;

revoke all on function public.approve_customer_unlink(uuid) from public, anon;
grant execute on function public.approve_customer_unlink(uuid) to authenticated;

commit;
