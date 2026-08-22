-- Staging preflight (read-only). Run before re-applying patches.
-- Never print phone numbers, emails, measurements, messages, or invite codes.
--
-- consume_rate_limit is (text, integer, integer) — not four arguments.

select
  to_regclass('public.designer_private_details') as private_table,
  to_regclass('public.marketplace_designers') as public_view,
  to_regprocedure('public.consume_rate_limit(text,integer,integer)') as limiter;

select
  has_table_privilege('anon', 'public.designer_profiles', 'SELECT')
    as anon_table_select,
  has_table_privilege('authenticated', 'public.designer_profiles', 'SELECT')
    as authenticated_table_select,
  has_column_privilege(
    'anon', 'public.designer_profiles', 'phone', 'SELECT'
  ) as anon_phone,
  has_column_privilege(
    'anon', 'public.designer_profiles', 'user_id', 'SELECT'
  ) as anon_user_id,
  has_column_privilege(
    'authenticated', 'public.designer_profiles', 'admin_notes', 'SELECT'
  ) as authenticated_admin_notes;
-- After patch-designer-private-details.sql all five must be false.
