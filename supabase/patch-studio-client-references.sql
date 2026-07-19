-- Optional: studio client style reference image URLs
alter table public.studio_clients
  add column if not exists reference_images jsonb not null default '[]'::jsonb;
