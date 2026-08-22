-- Counts-only inventory of unscoped private storage objects.
-- Do not print filenames or personal data. Do not move or delete objects.
-- Run in staging/production SQL editor after approval.

select
  o.bucket_id,
  count(*) filter (
    where split_part(o.name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) as scoped_project_objects,
  count(*) filter (
    where o.name like '%/%'
      and o.name not like '%/%/%'
      and split_part(o.name, '/', 2) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) as unscoped_legacy_objects
from storage.objects o
where o.bucket_id in (
  'project-references',
  'project-progress',
  'customer-inspiration',
  'message-attachments'
)
group by o.bucket_id
order by o.bucket_id;
