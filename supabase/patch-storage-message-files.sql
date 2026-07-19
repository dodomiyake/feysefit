-- Storage bucket for message attachments (images, PDFs, documents).
-- Run in Supabase SQL Editor after storage.sql.
-- NOTE: Keeps message-attachments PRIVATE. For full storage hardening, also run
-- patch-storage-security.sql (authoritative). Do not re-publicize private buckets.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
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
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Ensure insert policies still allow authenticated users into their own folder
-- without granting public SELECT on private media.
drop policy if exists "storage_insert_own_folder" on storage.objects;

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
