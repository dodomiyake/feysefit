begin;

drop trigger if exists trg_archive_marketplace_enquiry_on_unlink
  on public.designer_customer_relationships;
drop function if exists app_private.archive_marketplace_enquiry_on_unlink();

-- Preserve historical rows by returning the added state to accepted before
-- restoring the previous constraint.
update public.marketplace_enquiries
set status = 'accepted'
where status = 'unlinked';

alter table public.marketplace_enquiries
  drop constraint if exists marketplace_enquiries_status_check;
alter table public.marketplace_enquiries
  add constraint marketplace_enquiries_status_check
  check (status in (
    'pending', 'discussing', 'accepted',
    'declined', 'cancelled', 'expired'
  ));

-- Publication membership is intentionally retained because removing it can
-- interrupt clients still running the forward application version.

commit;
