# Storage and upload hardening

## Implemented

- Private buckets stay private; display uses short-lived signed URLs (`SIGNED_URL_TTL_SECONDS` = 5 minutes).
- Image uploads sniff magic bytes (JPEG/PNG/WebP/GIF). SVG, HTML, JavaScript, and executable extensions are blocked.
- JPEG/PNG/WebP are re-encoded in the browser to strip EXIF/GPS before upload. GIF is kept for animation and is **not** re-encoded.
- Object names use `crypto.randomUUID()` rather than the original filename.
- Storage RLS (`can_read_private_storage_object`) requires the caller to be the owner, an admin, or a project participant.

## Not implemented (do not claim)

- **Malware scanning** of document or message attachments. Documents are not quarantined behind a scanner.
- A dedicated server-side upload proxy that re-validates bytes after the client. Production uploads still go from the browser to Supabase Storage under RLS. Magic-byte checks run in the client; they are not a substitute for a server scanner.

## Retention

Deleted projects and accounts currently rely on database `ON DELETE` cascades for rows. Object cleanup in Storage is **not** fully automated. Operators must plan a retention job that deletes objects under `{user_id}/` after account deletion and `{user_id}/{project_id}/` after project deletion.

## GIF

GIF remains allowed for portfolio/avatars. Treat animated GIF as a residual content-type risk (no EXIF strip, possible oversized frames). Disable it later if product no longer needs animation.
