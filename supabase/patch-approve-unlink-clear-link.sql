-- FeyseFit: approve unlink must always clear the designer–client relationship.
-- Run in Supabase SQL Editor after schema / RLS patches.
-- Also heals clients stuck with unlink_status = approved while is_active = true.

begin;

-- ---------------------------------------------------------------------------
-- 1) Privileged deactivate (bypasses RLS "marketplace_live" with-check trap)
-- ---------------------------------------------------------------------------
create or replace function public.deactivate_customer_relationships(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_customer_id is null then
    raise exception 'customer id required';
  end if;

  if not (
    public.is_admin()
    or p_customer_id = public.current_customer_profile_id()
  ) then
    raise exception 'Not authorized to deactivate relationships';
  end if;

  update public.designer_customer_relationships
  set is_active = false
  where customer_id = p_customer_id
    and is_active = true;
end;
$$;

revoke all on function public.deactivate_customer_relationships(uuid) from public;
grant execute on function public.deactivate_customer_relationships(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Admin approve: mark request + clear profile link + deactivate relationship
-- ---------------------------------------------------------------------------
create or replace function public.approve_customer_unlink(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can approve unlink requests';
  end if;

  select customer_id into v_customer_id
  from public.unlink_requests
  where id = p_request_id;

  if v_customer_id is null then
    raise exception 'Unlink request not found';
  end if;

  update public.unlink_requests
  set status = 'approved'
  where id = p_request_id;

  update public.unlink_requests
  set
    status = 'declined',
    admin_notes = coalesce(admin_notes, 'Closed as duplicate of the approved unlink request.'),
    designer_response = coalesce(designer_response, 'Superseded by approved unlink request.'),
    designer_responded_at = coalesce(designer_responded_at, now())
  where customer_id = v_customer_id
    and id <> p_request_id
    and status in ('pending', 'designer_review');

  update public.customer_profiles
  set
    unlink_status = 'approved',
    unlink_reason = null,
    unlink_submitted_at = null,
    active_unlink_request_id = p_request_id
  where id = v_customer_id;

  update public.designer_customer_relationships
  set is_active = false
  where customer_id = v_customer_id
    and is_active = true;
end;
$$;

revoke all on function public.approve_customer_unlink(uuid) from public;
grant execute on function public.approve_customer_unlink(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Customers may always deactivate their own link (is_active → false)
-- ---------------------------------------------------------------------------
drop policy if exists "relationships_customer_deactivate" on public.designer_customer_relationships;
create policy "relationships_customer_deactivate" on public.designer_customer_relationships
for update
using (customer_id = public.current_customer_profile_id())
with check (
  customer_id = public.current_customer_profile_id()
  and is_active = false
);

-- ---------------------------------------------------------------------------
-- 4) Heal stuck rows: approved unlink but relationship still active
-- ---------------------------------------------------------------------------
update public.designer_customer_relationships r
set is_active = false
from public.customer_profiles c
where r.customer_id = c.id
  and r.is_active = true
  and c.unlink_status = 'approved';

commit;
