-- FeyseFit pre-link marketplace enquiry conversations
-- Apply after patch-marketplace-enquiries.sql.
-- Replies never create a relationship. The client confirms readiness first,
-- then the designer explicitly finalises the agreement and activates the pair.

begin;

alter table public.marketplace_enquiries
  add column if not exists customer_agreed_at timestamptz;

alter table public.marketplace_enquiries
  drop constraint if exists marketplace_enquiries_status_check;
alter table public.marketplace_enquiries
  add constraint marketplace_enquiries_status_check
  check (status in ('pending', 'discussing', 'accepted', 'declined', 'cancelled', 'expired'));

drop index if exists public.marketplace_enquiries_one_pending_pair_idx;
create unique index marketplace_enquiries_one_open_pair_idx
  on public.marketplace_enquiries (customer_id, designer_id)
  where status in ('pending', 'discussing');

create or replace function app_private.enforce_marketplace_enquiry_open_limit()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if (
    select count(*)
    from public.marketplace_enquiries e
    where e.customer_id = new.customer_id
      and e.status in ('pending', 'discussing')
      and e.expires_at > clock_timestamp()
  ) >= 3 then
    raise exception 'pending enquiry limit reached';
  end if;
  return new;
end;
$$;

revoke all on function app_private.enforce_marketplace_enquiry_open_limit()
  from public, anon, authenticated;

drop trigger if exists trg_marketplace_enquiry_open_limit
  on public.marketplace_enquiries;
create trigger trg_marketplace_enquiry_open_limit
before insert on public.marketplace_enquiries
for each row execute function app_private.enforce_marketplace_enquiry_open_limit();

create table if not exists public.marketplace_enquiry_messages (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.marketplace_enquiries (id) on delete cascade,
  sender_user_id uuid not null,
  sender_role text not null check (sender_role in ('customer', 'designer')),
  sender_name text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists marketplace_enquiry_messages_enquiry_created_idx
  on public.marketplace_enquiry_messages (enquiry_id, created_at, id);

alter table public.marketplace_enquiry_messages enable row level security;
alter table public.marketplace_enquiry_messages force row level security;

revoke all on table public.marketplace_enquiry_messages
  from public, anon, authenticated;
grant select (
  id, enquiry_id, sender_role, sender_name, body, created_at
) on table public.marketplace_enquiry_messages to authenticated;

drop policy if exists marketplace_enquiry_messages_read_participants
  on public.marketplace_enquiry_messages;
create policy marketplace_enquiry_messages_read_participants
on public.marketplace_enquiry_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.marketplace_enquiries e
    where e.id = enquiry_id
      and (
        e.customer_id = public.current_customer_profile_id()
        or e.designer_id = public.current_designer_profile_id()
        or public.is_admin()
      )
  )
);

create or replace function public.accept_marketplace_enquiry_for_discussion(
  p_enquiry_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_enquiry public.marketplace_enquiries%rowtype;
  v_designer_id uuid := public.current_designer_profile_id();
  v_message_id uuid;
begin
  if auth.uid() is null or v_designer_id is null then
    raise exception 'designer account required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'reply required to accept enquiry for discussion';
  end if;
  if app_private.consume_rate_limit(
    'messaging_write', app_private.uid_rate_limit_bucket()
  ) is distinct from true then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  select * into v_enquiry
  from public.marketplace_enquiries
  where id = p_enquiry_id
  for update;

  if not found or v_enquiry.designer_id <> v_designer_id then
    raise exception 'enquiry not found' using errcode = '42501';
  end if;
  if v_enquiry.status <> 'pending' then
    raise exception 'enquiry is no longer awaiting a response';
  end if;
  if v_enquiry.expires_at <= clock_timestamp() then
    raise exception 'enquiry has expired';
  end if;

  insert into public.marketplace_enquiry_messages (
    enquiry_id, sender_user_id, sender_role, sender_name, body
  ) values (
    v_enquiry.id, auth.uid(), 'designer', v_enquiry.designer_name, trim(p_body)
  ) returning id into v_message_id;

  update public.marketplace_enquiries
  set status = 'discussing',
      customer_agreed_at = null,
      expires_at = clock_timestamp() + interval '14 days'
  where id = v_enquiry.id;

  return v_message_id;
end;
$$;

revoke all on function public.accept_marketplace_enquiry_for_discussion(uuid, text)
  from public, anon;
grant execute on function public.accept_marketplace_enquiry_for_discussion(uuid, text)
  to authenticated;

create or replace function public.send_marketplace_enquiry_message(
  p_enquiry_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, app_private
as $$
declare
  v_enquiry public.marketplace_enquiries%rowtype;
  v_customer_id uuid := public.current_customer_profile_id();
  v_designer_id uuid := public.current_designer_profile_id();
  v_sender_role text;
  v_sender_name text;
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'invalid enquiry message';
  end if;
  if app_private.consume_rate_limit(
    'messaging_write', app_private.uid_rate_limit_bucket()
  ) is distinct from true then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  select * into v_enquiry
  from public.marketplace_enquiries
  where id = p_enquiry_id
  for update;

  if not found then
    raise exception 'enquiry not found' using errcode = '42501';
  end if;
  if v_customer_id = v_enquiry.customer_id then
    v_sender_role := 'customer';
    v_sender_name := v_enquiry.customer_name;
  elsif v_designer_id = v_enquiry.designer_id then
    v_sender_role := 'designer';
    v_sender_name := v_enquiry.designer_name;
  else
    raise exception 'enquiry not found' using errcode = '42501';
  end if;
  if v_enquiry.status <> 'discussing' then
    raise exception 'enquiry is not open for discussion';
  end if;
  if v_enquiry.expires_at <= clock_timestamp() then
    update public.marketplace_enquiries
    set status = 'expired'
    where id = v_enquiry.id;
    raise exception 'enquiry has expired';
  end if;

  insert into public.marketplace_enquiry_messages (
    enquiry_id, sender_user_id, sender_role, sender_name, body
  ) values (
    v_enquiry.id, auth.uid(), v_sender_role, v_sender_name, trim(p_body)
  ) returning id into v_message_id;

  -- Any new discussion invalidates an earlier client confirmation so the
  -- final link always covers the latest terms in the thread.
  update public.marketplace_enquiries
  set customer_agreed_at = null,
      expires_at = clock_timestamp() + interval '14 days'
  where id = v_enquiry.id;

  return v_message_id;
end;
$$;

revoke all on function public.send_marketplace_enquiry_message(uuid, text)
  from public, anon;
grant execute on function public.send_marketplace_enquiry_message(uuid, text)
  to authenticated;

create or replace function public.confirm_marketplace_enquiry_customer_agreement(
  p_enquiry_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_customer_id uuid := public.current_customer_profile_id();
  v_enquiry public.marketplace_enquiries%rowtype;
begin
  if auth.uid() is null or v_customer_id is null then
    raise exception 'customer account required' using errcode = '42501';
  end if;

  select * into v_enquiry
  from public.marketplace_enquiries
  where id = p_enquiry_id
  for update;

  if not found or v_enquiry.customer_id <> v_customer_id then
    raise exception 'enquiry not found' using errcode = '42501';
  end if;
  if v_enquiry.status <> 'discussing' then
    raise exception 'enquiry is not open for discussion';
  end if;
  if v_enquiry.expires_at <= clock_timestamp() then
    update public.marketplace_enquiries
    set status = 'expired'
    where id = v_enquiry.id;
    raise exception 'enquiry has expired';
  end if;
  if not exists (
    select 1
    from public.marketplace_enquiry_messages m
    where m.enquiry_id = v_enquiry.id
      and m.sender_role = 'designer'
  ) then
    raise exception 'designer reply required before agreement';
  end if;

  update public.marketplace_enquiries
  set customer_agreed_at = clock_timestamp()
  where id = v_enquiry.id;
end;
$$;

revoke all on function public.confirm_marketplace_enquiry_customer_agreement(uuid)
  from public, anon;
grant execute on function public.confirm_marketplace_enquiry_customer_agreement(uuid)
  to authenticated;

create or replace function public.confirm_marketplace_enquiry_agreement(
  p_enquiry_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_designer_id uuid := public.current_designer_profile_id();
  v_enquiry public.marketplace_enquiries%rowtype;
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
  if v_enquiry.status <> 'discussing' then
    raise exception 'enquiry is not open for discussion';
  end if;
  if v_enquiry.expires_at <= clock_timestamp() then
    update public.marketplace_enquiries
    set status = 'expired'
    where id = v_enquiry.id;
    raise exception 'enquiry has expired';
  end if;
  if v_enquiry.customer_agreed_at is null then
    raise exception 'client agreement required before linking';
  end if;
  if exists (
    select 1
    from public.marketplace_enquiry_messages m
    where m.enquiry_id = v_enquiry.id
      and m.created_at > v_enquiry.customer_agreed_at
  ) then
    raise exception 'client must reconfirm the latest discussion';
  end if;

  insert into public.designer_customer_relationships (
    designer_id, customer_id, registration_type, is_active
  ) values (
    v_enquiry.designer_id, v_enquiry.customer_id, 'direct', true
  )
  on conflict (designer_id, customer_id) do update
    set registration_type = 'direct', is_active = true;

  update public.marketplace_enquiries
  set status = 'accepted',
      accepted_at = clock_timestamp()
  where id = v_enquiry.id;
end;
$$;

revoke all on function public.confirm_marketplace_enquiry_agreement(uuid)
  from public, anon;
grant execute on function public.confirm_marketplace_enquiry_agreement(uuid)
  to authenticated;

-- Keep the existing signature for safe compatibility, but remove its ability
-- to accept/link. It now supports decline only; final linking uses the explicit
-- agreement RPC above.
create or replace function public.respond_to_marketplace_enquiry(
  p_enquiry_id uuid,
  p_decision text,
  p_response text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_enquiry public.marketplace_enquiries%rowtype;
  v_designer_id uuid := public.current_designer_profile_id();
  v_decision text := lower(trim(coalesce(p_decision, '')));
begin
  if auth.uid() is null or v_designer_id is null then
    raise exception 'designer account required' using errcode = '42501';
  end if;
  if v_decision <> 'declined'
     or char_length(trim(coalesce(p_response, ''))) > 1000 then
    raise exception 'reply in the enquiry thread before confirming agreement';
  end if;

  select * into v_enquiry
  from public.marketplace_enquiries
  where id = p_enquiry_id
  for update;

  if not found or v_enquiry.designer_id <> v_designer_id then
    raise exception 'enquiry not found' using errcode = '42501';
  end if;
  if v_enquiry.status not in ('pending', 'discussing') then
    raise exception 'enquiry is no longer open';
  end if;

  update public.marketplace_enquiries
  set status = 'declined',
      designer_response = nullif(trim(coalesce(p_response, '')), ''),
      customer_agreed_at = null,
      declined_at = clock_timestamp()
  where id = v_enquiry.id;
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
  set status = 'cancelled',
      customer_agreed_at = null,
      cancelled_at = clock_timestamp()
  where id = p_enquiry_id
    and customer_id = v_customer_id
    and status in ('pending', 'discussing');

  if not found then
    raise exception 'open enquiry not found';
  end if;
end;
$$;

revoke all on function public.cancel_marketplace_enquiry(uuid) from public, anon;
grant execute on function public.cancel_marketplace_enquiry(uuid) to authenticated;

commit;
