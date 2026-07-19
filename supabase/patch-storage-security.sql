-- FeyseFit storage security source of truth (idempotent).
-- Run AFTER storage.sql and patch-designer-authorized-relationship.sql
-- (needs public.is_admin() and public.designer_authorized_for_project()).
-- Safe to re-run. Prefer this over older patch-storage-private.sql /
-- patch-storage-message-files.sql for privacy flags and SELECT policies.

begin;

-- ---------------------------------------------------------------------------
-- Bucket visibility + MIME/size (never make private media public here)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Upload policies: user folders on app buckets; measurement-guides admin-only
-- Path layout: {auth.uid()}/... or {auth.uid()}/{project_id}/...
-- ---------------------------------------------------------------------------
drop policy if exists "storage_insert_own_folder" on storage.objects;
drop policy if exists "storage_update_own_folder" on storage.objects;
drop policy if exists "storage_delete_own_folder" on storage.objects;
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

create policy "storage_insert_measurement_guides_admin"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'measurement-guides'
  and public.is_admin()
);

create policy "storage_update_own_folder"
on storage.objects for update
to authenticated
using (
  (storage.foldername(name))[1] = auth.uid()::text
  or (bucket_id = 'measurement-guides' and public.is_admin())
)
with check (
  (storage.foldername(name))[1] = auth.uid()::text
  or (bucket_id = 'measurement-guides' and public.is_admin())
);

create policy "storage_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  (storage.foldername(name))[1] = auth.uid()::text
  or (bucket_id = 'measurement-guides' and public.is_admin())
);

-- ---------------------------------------------------------------------------
-- Private object SELECT: owner, admin, or project-linked participants
-- Removes blanket “any active relationship → whole folder” access.
-- ---------------------------------------------------------------------------
create or replace function public.can_read_private_storage_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with parts as (
    select
      (storage.foldername(object_name))[1] as owner_id,
      (storage.foldername(object_name))[2] as second_segment
  ),
  scoped as (
    select
      owner_id,
      case
        when second_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then second_segment::uuid
        else null
      end as project_id
    from parts
  )
  select
    auth.uid() is not null
    and (
      exists (
        select 1 from scoped s where s.owner_id = auth.uid()::text
      )
      or public.is_admin()
      -- New layout: {userId}/{projectId}/file — only that project's parties
      or exists (
        select 1
        from scoped s
        join public.projects p on p.id = s.project_id
        join public.customer_profiles cp on cp.id = p.customer_id
        where s.project_id is not null
          and (
            public.designer_authorized_for_project(p.id)
            or cp.user_id = auth.uid()
          )
      )
      -- Legacy layout (no project folder): shared project between viewer and folder owner
      or exists (
        select 1
        from scoped s
        join public.projects p
          on true
        join public.customer_profiles cp on cp.id = p.customer_id
        join public.designer_profiles dp on dp.id = p.designer_id
        where s.project_id is null
          and (
            cp.user_id::text = s.owner_id
            or dp.user_id::text = s.owner_id
          )
          and (
            public.designer_authorized_for_project(p.id)
            or cp.user_id = auth.uid()
          )
      )
    );
$$;

revoke all on function public.can_read_private_storage_object(text) from public;
grant execute on function public.can_read_private_storage_object(text) to authenticated;

drop policy if exists "storage_public_read" on storage.objects;
drop policy if exists "storage_authenticated_read_private" on storage.objects;

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
  and public.can_read_private_storage_object(name)
);

commit;
