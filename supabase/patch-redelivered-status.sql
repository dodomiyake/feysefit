-- Add Re-delivered project status (after issue resolution, before final completion).
-- Run if redelivery fails with invalid enum value for project_status: "Re-delivered"

do $$ begin
  alter type public.project_status add value 'Re-delivered';
exception
  when duplicate_object then null;
end $$;

drop policy if exists "delivery_issues_customer_insert" on public.project_delivery_issues;
create policy "delivery_issues_customer_insert" on public.project_delivery_issues
for insert with check (
  exists (
    select 1
    from public.customer_profiles cp
    join public.projects p on p.id = project_delivery_issues.project_id
    where cp.id = project_delivery_issues.customer_id
      and cp.user_id = auth.uid()
      and p.status in (
        'Awaiting Customer Confirmation'::public.project_status,
        'Delivered'::public.project_status,
        'Re-delivered'::public.project_status
      )
      and (p.customer_id = cp.id or p.customer_name = cp.name)
  )
);
