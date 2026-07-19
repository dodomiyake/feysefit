-- FeyseFit enum types (run before patches or partial schema applies)
-- Safe to re-run.

do $$ begin
  create type public.user_role as enum ('designer', 'customer', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.project_status as enum (
    'Enquiry',
    'Measurements Needed',
    'Design Confirmed',
    'In Production',
    'Ready for Delivery',
    'Delivered'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.invite_status as enum ('pending', 'accepted', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.marketplace_status as enum ('pending', 'approved', 'declined');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.measurement_status as enum ('draft', 'submitted');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.report_status as enum ('open', 'dismissed', 'resolved');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.unlink_status as enum ('none', 'pending', 'designer_review', 'approved', 'declined');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.registration_type as enum ('invited', 'direct');
exception when duplicate_object then null;
end $$;
