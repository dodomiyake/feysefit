-- Align direct signup customers (marketplace links without accepted invites)
-- Run in Supabase SQL editor if admin Relationships still shows invited for direct customers.

-- Profile + relationship: customers with an active link but no accepted invite → direct
update public.customer_profiles c
set registration_type = 'direct'::public.registration_type
where exists (
    select 1
    from public.designer_customer_relationships r
    where r.customer_id = c.id
      and r.is_active = true
  )
  and not exists (
    select 1
    from public.invite_codes ic
    where lower(ic.email) = lower(c.email)
      and ic.status = 'accepted'
  )
  and coalesce(c.registration_type::text, 'invited') <> 'direct';

update public.designer_customer_relationships r
set registration_type = 'direct'::public.registration_type
from public.customer_profiles c
where c.id = r.customer_id
  and c.registration_type = 'direct'::public.registration_type
  and r.registration_type = 'invited'::public.registration_type;

-- Keep profile and relationship in sync when profile already says direct
update public.designer_customer_relationships r
set registration_type = c.registration_type
from public.customer_profiles c
where c.id = r.customer_id
  and c.registration_type is not null
  and r.registration_type is distinct from c.registration_type;
