-- Keep instant no-active-project unlinks visible and consistent for admin/client views.
--
-- Context:
-- auto_approve_unlink_without_active_project() may approve the request in a
-- BEFORE INSERT trigger. The client app must not leave customer_profiles in a
-- stale pending/designer_review state after that request has already closed.

with latest_approved as (
  select distinct on (ur.customer_id)
    ur.customer_id,
    ur.id as request_id
  from public.unlink_requests ur
  where ur.status = 'approved'
  order by ur.customer_id, ur.created_at desc nulls last, ur.id desc
)
update public.customer_profiles c
set unlink_status = 'approved',
    unlink_reason = null,
    unlink_submitted_at = null,
    active_unlink_request_id = latest_approved.request_id
from latest_approved
where c.id = latest_approved.customer_id
  and not exists (
    select 1
    from public.designer_customer_relationships r
    where r.customer_id = c.id
      and r.is_active = true
  )
  and (
    c.unlink_status is distinct from 'approved'
    or c.active_unlink_request_id is distinct from latest_approved.request_id
    or c.unlink_reason is not null
    or c.unlink_submitted_at is not null
  );
