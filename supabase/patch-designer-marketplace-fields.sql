-- Designer marketplace location, pricing, and in-person appointment flag
alter table public.designer_profiles
  add column if not exists city text not null default '',
  add column if not exists country text not null default '',
  add column if not exists offers_in_person boolean not null default false,
  add column if not exists price_range_min int,
  add column if not exists price_range_max int;
