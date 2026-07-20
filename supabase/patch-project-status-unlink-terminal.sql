-- FeyseFit: terminal project_status values for unlink eligibility.
-- Run FIRST, then run patch-unlink-archive-messaging.sql.
-- PostgreSQL requires new enum values to commit before use in functions/policies.

do $$ begin
  alter type public.project_status add value 'Cancelled';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter type public.project_status add value 'Admin Support';
exception
  when duplicate_object then null;
end $$;
