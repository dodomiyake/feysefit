-- Roll back the marketplace enquiry feature without restoring the insecure
-- immediate-link RPC or customer relationship INSERT/UPDATE grants.

begin;

drop function if exists public.create_project_from_marketplace_enquiry(uuid);
drop function if exists public.cancel_marketplace_enquiry(uuid);
drop function if exists public.respond_to_marketplace_enquiry(uuid, text, text);
drop function if exists public.create_marketplace_enquiry(uuid, text, text, text, date, text);
drop trigger if exists trg_marketplace_enquiries_updated_at on public.marketplace_enquiries;
drop function if exists app_private.set_marketplace_enquiry_updated_at();
drop table if exists public.marketplace_enquiries;

commit;
