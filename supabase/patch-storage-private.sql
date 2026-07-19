-- Make sensitive storage buckets private.
-- DEPRECATED for access control: use patch-storage-security.sql instead.
-- This file alone previously allowed any authenticated user to read private objects.

update storage.buckets
set public = false
where id in (
  'message-attachments',
  'project-references',
  'project-progress',
  'customer-inspiration'
);

update storage.buckets
set public = true
where id in (
  'avatars',
  'designer-portfolios',
  'measurement-guides'
);

-- Do not recreate loose authenticated SELECT policies here.
-- Run patch-storage-security.sql for can_read_private_storage_object.
