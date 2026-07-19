-- Prerequisite: extend project_status for post-delivery + testimonials.
-- Run this FIRST if patch-testimonials.sql fails with:
--   invalid input value for enum project_status: "Completed"
--
-- Then re-run patch-testimonials.sql and patch-post-delivery-flow.sql.

do $$ begin
  alter type public.project_status add value 'Awaiting Customer Confirmation';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter type public.project_status add value 'Completed';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter type public.project_status add value 'Issue Reported';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter type public.project_status add value 'Adjustment Needed';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter type public.project_status add value 'Re-delivered';
exception
  when duplicate_object then null;
end $$;
