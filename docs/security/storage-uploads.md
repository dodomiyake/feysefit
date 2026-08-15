# Storage and upload hardening

## Implemented

- Private buckets stay private; display uses short-lived signed URLs (`SIGNED_URL_TTL_SECONDS` = 5 minutes).
- GIF is not accepted. Allowed image types are JPEG, PNG, and WebP.
- Public and project images go through `POST /auth/uploads/promote`:
  - authenticated session required
  - server-side magic-byte check
  - `sharp` decode/re-encode (strips metadata)
  - max 5MB and 4096×4096 pixels (`limitInputPixels`)
  - service-role write to the destination bucket
- Follow-up 2 revokes authenticated `INSERT` on `avatars` and `designer-portfolios`. Direct Storage uploads cannot become public from spoofed `image/*` metadata.
- Quarantine bucket `uploads-quarantine` is private.
- **Storage-API cleanup:** `POST /auth/uploads/cleanup-quarantine` with `CRON_SECRET` removes expired objects through `storage.remove()` (counts only in logs).
- No SQL function deletes quarantine objects. Hosted Supabase blocks direct deletion from `storage.objects`; schedule the Storage-API route with `CRON_SECRET`.
- Object names use `crypto.randomUUID()` rather than the original filename.
- Storage RLS (`can_read_private_storage_object`, **EXECUTE** not SELECT) allows:
  - the object owner (first path segment = `auth.uid()`)
  - an AAL2 admin
  - a participant of the **project UUID** in the path, when the project is not archived and the relationship is active
- Unscoped legacy paths (`{user_id}/file` with no project UUID) are **not** readable by other project participants. Only the owner or an AAL2 admin.

## Documents

Message documents stay in the private `message-attachments` bucket with `Content-Disposition: attachment` when the Storage API accepts that option. Treat them as untrusted.

## Not implemented (do not claim)

- **Malware scanning** of document or message attachments.
- Automatic migration of unscoped private objects into project-scoped paths. Inventory with `supabase/tests/unscoped-storage-inventory.sql` (counts only). Copy to `{user_id}/{project_id}/...`, confirm access, then delete unscoped copies in a later window. Do not auto-move or auto-delete.

## Residual risk

Direct Storage uploads to remaining private buckets can still bypass re-encode. Those objects are not public. Public image buckets require the promote route after follow-up 2.

Quarantine objects remain until `POST /auth/uploads/cleanup-quarantine` is scheduled. The route deletes through `storage.remove()` so catalog and backend bytes stay coordinated.
