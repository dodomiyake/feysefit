-- Designer years of experience on marketplace / profile
alter table public.designer_profiles
  add column if not exists years_experience int;
