-- FeyseFit Supabase Storage buckets and policies
-- Run in Supabase SQL Editor after schema.sql
-- After this file, run patch-storage-security.sql for private-read hardening.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('designer-portfolios', 'designer-portfolios', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('project-references', 'project-references', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('project-progress', 'project-progress', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('customer-inspiration', 'customer-inspiration', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('measurement-guides', 'measurement-guides', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
  (
    'message-attachments',
    'message-attachments',
    false,
    10485760,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ]
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Authenticated users upload into their own folder: {auth.uid()}/...
-- measurement-guides is admin-only (see patch-storage-security.sql).
drop policy if exists "storage_insert_own_folder" on storage.objects;
drop policy if exists "storage_update_own_folder" on storage.objects;
drop policy if exists "storage_delete_own_folder" on storage.objects;
drop policy if exists "storage_public_read" on storage.objects;
drop policy if exists "storage_authenticated_read_private" on storage.objects;
drop policy if exists "storage_insert_measurement_guides_admin" on storage.objects;

create policy "storage_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id in (
    'avatars',
    'designer-portfolios',
    'project-references',
    'project-progress',
    'customer-inspiration',
    'message-attachments'
  )
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_update_own_folder"
on storage.objects for update
to authenticated
using ((storage.foldername(name))[1] = auth.uid()::text)
with check ((storage.foldername(name))[1] = auth.uid()::text);

create policy "storage_delete_own_folder"
on storage.objects for delete
to authenticated
using ((storage.foldername(name))[1] = auth.uid()::text);

-- Public read for marketplace and profile imagery only
create policy "storage_public_read"
on storage.objects for select
to public
using (
  bucket_id in (
    'avatars',
    'designer-portfolios',
    'measurement-guides'
  )
);

-- Temporary private read until patch-storage-security.sql replaces this with
-- can_read_private_storage_object (owner / project-linked only).
create policy "storage_authenticated_read_private"
on storage.objects for select
to authenticated
using (
  bucket_id in (
    'message-attachments',
    'project-references',
    'project-progress',
    'customer-inspiration'
  )
  and (storage.foldername(name))[1] = auth.uid()::text
);
