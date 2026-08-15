# Security hardening — staging rollout

Do **not** apply these files to production from this repository, and do **not**
deploy application code that depends on `consume_rate_limit_server` until that
function exists in the target database. Protected actions fail closed with
HTTP 503 if the HMAC secret or service-role limiter is missing.

## Rollout order (staging)

1. Take a staging backup.
2. Apply the database patches in the order below.
3. Run the staging security test scripts (they `ROLLBACK`).
4. Verify the limiter and grants.
5. Enable leaked-password protection in the Auth dashboard if Advisor still reports it off. See `docs/security/leaked-password-protection.md`. This is release-blocking.
6. Set staging server-only secrets (never `NEXT_PUBLIC_*`):
   - `SECURITY_COOKIE_SECRET` (optional `SECURITY_COOKIE_SECRET_PREVIOUS` during rotation)
   - `RATE_LIMIT_HMAC_SECRET`
   - `SECURITY_EVENT_HMAC_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `USE_LEGACY_API=false`
   - `TRUST_CLOUDFLARE=1` only when the deployment is behind Cloudflare
   - `TRUSTED_PROXY=1` only behind a proxy that overwrites `x-forwarded-for`
   - Vercel already sets `VERCEL=1`; do not also trust arbitrary forwarding headers
   - `CRON_SECRET` to authorize `POST /auth/uploads/cleanup-quarantine` (Storage API byte delete)
7. Deploy the hardened application **after** the SQL, except public-image INSERT
   revocation in follow-up 2 which must land in the same window as `/auth/uploads/promote`.
8. Run the end-to-end authorization matrix against **staging Supabase** (anon + authenticated
   keys). Disposable `postgres:16-alpine` is not equivalent to Supabase.
9. Re-run Supabase Security Advisor.
10. Only then plan a production maintenance window. Do not apply production SQL from this repository automatically.

## Database patches (step 2)

Existing production baseline (already applied historically; do not re-run unless a new project):

- `supabase/schema.sql` or the previously applied `patch-*.sql` chain
- `supabase/patch-designer-contact-service-areas.sql` (already live — do not re-run)
- `supabase/patch-marketplace-admin-approval.sql` (already live — do not re-run)
- First hardening pass (if already live, do not re-run as the only remedy):
  - `supabase/patch-designer-private-details.sql`
  - `supabase/patch-testimonial-view-lockdown.sql`
  - `supabase/patch-function-execute-lockdown.sql`
  - `supabase/patch-admin-aal-rls.sql`

Then, in a **staging** SQL editor, entire files from line 1:

1. Optional read-only check: `supabase/tests/staging-preflight.sql`
2. If the first hardening pass is not on this project, apply those four files.
3. `supabase/patch-security-audit-followup.sql` (additive follow-up from the second audit)
4. `supabase/patch-security-audit-followup-2.sql` (account-activity EXECUTE, database cleanup, public-image INSERT revoke). This file **raises** if `app_private` or `consume_rate_limit_server` from follow-up 1 are missing. Quarantine objects are deleted through the Storage API endpoint, never direct SQL.\n5. `supabase/patch-security-audit-followup-3.sql` (authenticated-only helper policies and anonymous marketplace reads).

Limiter for the application is now:

```sql
select to_regprocedure('public.consume_rate_limit_server(text,text)');
```

`public.consume_rate_limit(text,integer,integer)` remains as a deny stub. Anon and authenticated must not have `EXECUTE`.

## After patches (steps 3–4)

1. `supabase/tests/security-hardening.sql` (staging only; ends in `ROLLBACK`)
2. `supabase/tests/security-audit-followup.sql` (staging only; ends in `ROLLBACK`)
3. `supabase/tests/security-audit-followup-2.sql` (staging only; ends in `ROLLBACK`)\n4. `supabase/tests/security-audit-followup-3.sql` (staging only; ends in `ROLLBACK`)\n5. Counts-only unscoped inventory: `supabase/tests/unscoped-storage-inventory.sql` (no filenames)
5. Grant boundary — all five must be `false`:

```sql
select
  has_table_privilege('anon', 'public.designer_profiles', 'SELECT')
    as anon_table_select,
  has_table_privilege('authenticated', 'public.designer_profiles', 'SELECT')
    as authenticated_table_select,
  has_column_privilege(
    'anon', 'public.designer_profiles', 'phone', 'SELECT'
  ) as anon_phone,
  has_column_privilege(
    'anon', 'public.designer_profiles', 'user_id', 'SELECT'
  ) as anon_user_id,
  has_column_privilege(
    'authenticated', 'public.designer_profiles', 'admin_notes', 'SELECT'
  ) as authenticated_admin_notes;
```

4. Integrity columns — authenticated `UPDATE` on `rating`, `review_count`, and `marketplace_live` must be false.
5. Views — `is_updatable` / `is_insertable_into` = `NO`. `marketplace_testimonials` must be `security_invoker=true`.
6. Direct anon `EXECUTE` of `consume_rate_limit`, `log_security_event`, `log_account_activity`, and `lookup_invite_code` must fail.
7. `can_read_private_storage_object` is a function: check `EXECUTE`, not `SELECT`.
8. Enable `pg_cron` in staging if the follow-up 2 notice said it was skipped, then re-apply follow-up 2 so cleanup jobs register.

## Application deploy (step 7)

Deploy from `security/hardening-pass` only after step 2 created
`consume_rate_limit_server` and `log_account_activity_server`, and the HMAC / cookie secrets are set. Coordinate `/auth/uploads/promote` with the public-image INSERT revocation.

## Rollback order (reverse)

If follow-up 2 was applied and the matching application was **not** deployed:

1. `supabase/rollback-security-audit-followup-2.sql`
2. `supabase/rollback-security-audit-followup.sql`

Those rollbacks do **not** restore anonymous privacy exposure, blanket
`TRUNCATE`/`TRIGGER`/`REFERENCES`, browser limiter/logging execution, designer
updates to ratings / `marketplace_live`, or authenticated INSERT on public image buckets.
`rollback-function-execute-lockdown.sql` also keeps logging and limiter EXECUTE revoked.

Earlier first-pass rollbacks (only if those patches must be undone):

3. `supabase/rollback-admin-aal-rls.sql`
4. `supabase/rollback-function-execute-lockdown.sql`
5. `supabase/rollback-testimonial-view-lockdown.sql`
6. `supabase/rollback-designer-private-details.sql`

## Expected Security Advisor findings

- RLS helper functions (`is_admin`, `is_admin_aal2`, …) as SECURITY DEFINER. They read `auth.uid()` and `public.users.role`, not client-editable user metadata.
- Leaked-password protection is a dashboard Auth setting, not SQL. Enable it using `docs/security/leaked-password-protection.md` and keep it on the release-blocking checklist. Do not claim it is enabled until the dashboard/Advisor confirms it.
- `marketplace_testimonials` should **not** remain a `security_definer_view` ERROR after the follow-up patch.

## Storage leftover objects

Unscoped private objects (`{user_id}/filename` without a project UUID) are readable only by the uploader or an AAL2 admin after the follow-up patch. Do not delete them automatically. Run `supabase/tests/unscoped-storage-inventory.sql` for counts only. Plan a copy into `{user_id}/{project_id}/...` during a maintenance window, then confirm reads, then delete the unscoped copies.

## Rate-limit and log retention

Follow-up 2 registers `pg_cron` jobs when the extension exists. Absence of `pg_cron` does **not** abort the patch transaction.

- `feysefit-cleanup-rate-limits` — `app_private.cleanup_rate_limit_counters()` every hour at minute 15
- `feysefit-cleanup-security-logs` — `app_private.cleanup_security_logs()` daily
Quarantine cleanup is intentionally **not** a SQL cron job. Hosted Supabase blocks direct deletion from `storage.objects`. Schedule `POST /auth/uploads/cleanup-quarantine` with `CRON_SECRET` so deletion runs through the Storage API. See `docs/security/storage-uploads.md`.

If `pg_cron` is not enabled, those SQL jobs are skipped and must be scheduled after the extension is turned on. See also `docs/security/turnstile-gothrue.md` and `docs/security/jspdf-dompurify.md`.

