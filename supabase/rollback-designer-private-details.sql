-- ROLLBACK for patch-designer-private-details.sql
-- Restores designer_profiles grants used before the hardening pass.
-- Does not delete designer_private_details rows (contact data is preserved).
-- Re-copy phone onto designer_profiles only if you intentionally re-expose it.

begin;

drop view if exists public.marketplace_designers;

drop trigger if exists trg_ensure_designer_private_details on public.designer_profiles;
drop function if exists public.ensure_designer_private_details();
drop function if exists public.own_designer_profile();
drop function if exists public.admin_get_designer_moderation(uuid);
drop function if exists public.admin_set_designer_notes(uuid, text);
drop function if exists public.admin_lookup_profiles_by_user_ids(uuid[]);

grant all on table public.designer_profiles to anon, authenticated;

-- Keep designer_private_details unless an operator explicitly drops it:
-- drop table if exists public.designer_private_details;

commit;
