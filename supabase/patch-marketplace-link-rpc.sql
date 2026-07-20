-- FeyseFit: marketplace client request must reliably link + allow enquiry insert.
-- Run in Supabase SQL Editor after patch-approve-unlink-clear-link.sql / marketplace RLS.

begin;

-- ---------------------------------------------------------------------------
-- Privileged marketplace link (customer-initiated, marketplace-live designers)
-- Clears prior unlink state, deactivates other designers, activates this pair.
-- ---------------------------------------------------------------------------
create or replace function public.link_customer_to_marketplace_designer(p_designer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := public.current_customer_profile_id();
begin
  if v_customer_id is null then
    raise exception 'Only signed-in clients can request a marketplace designer';
  end if;

  if p_designer_id is null then
    raise exception 'Designer is required';
  end if;

  if not exists (
    select 1
    from public.designer_profiles d
    where d.id = p_designer_id
      and d.marketplace_live = true
  ) then
    raise exception 'This designer is not available on the marketplace';
  end if;

  -- Fresh marketplace link cancels a prior approved/declined unlink state.
  update public.customer_profiles
  set
    registration_type = 'direct',
    unlink_status = 'none',
    unlink_reason = null,
    unlink_submitted_at = null,
    active_unlink_request_id = null
  where id = v_customer_id;

  update public.designer_customer_relationships
  set is_active = false
  where customer_id = v_customer_id
    and is_active = true
    and designer_id is distinct from p_designer_id;

  insert into public.designer_customer_relationships (
    designer_id,
    customer_id,
    registration_type,
    is_active
  )
  values (
    p_designer_id,
    v_customer_id,
    'direct',
    true
  )
  on conflict (designer_id, customer_id) do update
  set
    is_active = true,
    registration_type = 'direct';
end;
$$;

revoke all on function public.link_customer_to_marketplace_designer(uuid) from public;
grant execute on function public.link_customer_to_marketplace_designer(uuid) to authenticated;

commit;
