-- Allow invited customers to link to their designer when accepting an invite code.
-- Run in Supabase SQL Editor after schema.sql.

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
