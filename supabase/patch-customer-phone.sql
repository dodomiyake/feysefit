-- Customer phone number on app customer profiles
alter table public.customer_profiles
  add column if not exists phone text not null default '';
