begin;

revoke all on function public.send_marketplace_enquiry_message(uuid, text)
  from public, anon, authenticated;
revoke all on function public.accept_marketplace_enquiry_for_discussion(uuid, text)
  from public, anon, authenticated;
revoke all on function public.confirm_marketplace_enquiry_customer_agreement(uuid)
  from public, anon, authenticated;
revoke all on function public.confirm_marketplace_enquiry_agreement(uuid)
  from public, anon, authenticated;

drop function if exists public.send_marketplace_enquiry_message(uuid, text);
drop function if exists public.accept_marketplace_enquiry_for_discussion(uuid, text);
drop function if exists public.confirm_marketplace_enquiry_customer_agreement(uuid);
drop function if exists public.confirm_marketplace_enquiry_agreement(uuid);
drop table if exists public.marketplace_enquiry_messages;
drop trigger if exists trg_marketplace_enquiry_open_limit
  on public.marketplace_enquiries;
drop function if exists app_private.enforce_marketplace_enquiry_open_limit();
update public.marketplace_enquiries
set status = 'pending'
where status = 'discussing';
drop index if exists public.marketplace_enquiries_one_open_pair_idx;
create unique index if not exists marketplace_enquiries_one_pending_pair_idx
  on public.marketplace_enquiries (customer_id, designer_id)
  where status = 'pending';
alter table public.marketplace_enquiries
  drop column if exists customer_agreed_at;
alter table public.marketplace_enquiries
  drop constraint if exists marketplace_enquiries_status_check;
alter table public.marketplace_enquiries
  add constraint marketplace_enquiries_status_check
  check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired'));

commit;
