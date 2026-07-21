-- FeyseFit: marketplace visibility requires explicit admin approval.
-- Run after patch-rls-anti-poaching.sql.

begin;

-- Remove any stale visibility flag that is not backed by an approved listing.
update public.designer_profiles dp
set marketplace_live = false,
    updated_at = now()
where dp.marketplace_live = true
  and not exists (
    select 1
    from public.marketplace_listings ml
    where ml.designer_id = dp.id
      and ml.status = 'approved'::public.marketplace_status
  );

-- Only an admin may make a profile live, and an approved listing must already exist.
create or replace function public.enforce_marketplace_live_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.marketplace_live = true
     and (
       tg_op = 'INSERT'
       or new.marketplace_live is distinct from old.marketplace_live
     ) then
    if not public.is_admin() then
      raise exception 'Only admins can enable marketplace visibility';
    end if;

    if not exists (
      select 1
      from public.marketplace_listings ml
      where ml.designer_id = new.id
        and ml.status = 'approved'::public.marketplace_status
    ) then
      raise exception 'Marketplace listing must be approved before it can be published';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_marketplace_live on public.designer_profiles;
create trigger trg_enforce_marketplace_live
  before insert or update on public.designer_profiles
  for each row
  execute function public.enforce_marketplace_live_change();

-- Declining a previously approved listing removes the profile immediately.
create or replace function public.sync_designer_marketplace_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'declined'::public.marketplace_status
     and new.status is distinct from old.status then
    update public.designer_profiles
    set marketplace_live = false,
        updated_at = now()
    where id = new.designer_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_designer_marketplace_approval on public.marketplace_listings;
create trigger trg_sync_designer_marketplace_approval
  after update of status on public.marketplace_listings
  for each row
  execute function public.sync_designer_marketplace_approval();

-- Public profile reads require both the live flag and an approved listing.
drop policy if exists "designer_profiles_public_read_live" on public.designer_profiles;
create policy "designer_profiles_public_read_live" on public.designer_profiles
for select using (
  (
    marketplace_live = true
    and exists (
      select 1
      from public.marketplace_listings ml
      where ml.designer_id = designer_profiles.id
        and ml.status = 'approved'::public.marketplace_status
    )
  )
  or user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.designer_customer_relationships r
    join public.customer_profiles c on c.id = r.customer_id
    where r.designer_id = designer_profiles.id
      and c.user_id = auth.uid()
      and r.is_active
  )
);

-- Portfolio records must not leak before approval. Owners/admins retain review access.
drop policy if exists "portfolio_public_read" on public.portfolio_images;
create policy "portfolio_public_read" on public.portfolio_images
for select using (
  (
    is_public
    and exists (
      select 1
      from public.designer_profiles d
      where d.id = portfolio_images.designer_id
        and d.marketplace_live = true
        and exists (
          select 1
          from public.marketplace_listings ml
          where ml.designer_id = d.id
            and ml.status = 'approved'::public.marketplace_status
        )
    )
  )
  or exists (
    select 1
    from public.designer_profiles d
    where d.id = portfolio_images.designer_id
      and d.user_id = auth.uid()
  )
  or public.is_admin()
);

commit;
