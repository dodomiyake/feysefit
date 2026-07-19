-- Remove customer_profiles rows for admin and designer accounts.
-- Run once in Supabase SQL Editor if admins appear in the customer directory.

delete from public.customer_profiles cp
using public.users u
where cp.user_id = u.id
  and u.role <> 'customer';
