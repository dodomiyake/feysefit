-- FeyseFit: live enquiry delivery and unlink status consistency.
-- Apply after patch-marketplace-enquiry-conversations.sql and the current
-- relationship-scoped unlink patches.

begin;

alter table public.marketplace_enquiries
  drop constraint if exists marketplace_enquiries_status_check;
alter table public.marketplace_enquiries
  add constraint marketplace_enquiries_status_check
  check (status in (
    'pending', 'discussing', 'accepted', 'unlinked',
    'declined', 'cancelled', 'expired'
  ));

-- Heal accepted enquiries whose relationship has already ended.
update public.marketplace_enquiries e
set status = 'unlinked',
    customer_agreed_at = null
where e.status = 'accepted'
  and not exists (
    select 1
    from public.designer_customer_relationships r
    where r.designer_id = e.designer_id
      and r.customer_id = e.customer_id
      and r.is_active = true
  );

create or replace function app_private.archive_marketplace_enquiry_on_unlink()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    update public.marketplace_enquiries
    set status = 'unlinked',
        customer_agreed_at = null
    where designer_id = old.designer_id
      and customer_id = old.customer_id
      and status = 'accepted';
    return old;
  end if;

  if old.is_active = true and new.is_active = false then
    update public.marketplace_enquiries
    set status = 'unlinked',
        customer_agreed_at = null
    where designer_id = old.designer_id
      and customer_id = old.customer_id
      and status = 'accepted';
  end if;
  return new;
end;
$$;

revoke all on function app_private.archive_marketplace_enquiry_on_unlink()
  from public, anon, authenticated;

drop trigger if exists trg_archive_marketplace_enquiry_on_unlink
  on public.designer_customer_relationships;
create trigger trg_archive_marketplace_enquiry_on_unlink
after update of is_active or delete on public.designer_customer_relationships
for each row execute function app_private.archive_marketplace_enquiry_on_unlink();

-- Realtime honours the existing participant RLS policies. Adding both tables
-- lets the bell and enquiry inbox refresh without polling.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'marketplace_enquiries'
  ) then
    alter publication supabase_realtime add table public.marketplace_enquiries;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'marketplace_enquiry_messages'
  ) then
    alter publication supabase_realtime add table public.marketplace_enquiry_messages;
  end if;
end
$$;

commit;
