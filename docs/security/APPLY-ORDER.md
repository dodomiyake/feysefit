# Security hardening — staging rollout

Do **not** apply these files to production from this repository, and do **not**
deploy the hardened application until `consume_rate_limit` exists in the target
database. Sign-in, signup, messaging, and other protected actions fail closed
with HTTP 503 if the limiter RPC is missing.

## Rollout order (staging)

1. Apply the database patches, including `consume_rate_limit`.
2. Run the staging security test script.
3. Verify the limiter directly.
4. Deploy the hardened application.
5. Run the end-to-end authorization matrix.
6. Run Supabase Security Advisor.
7. Only then plan production deployment.

## Database patches (step 1)

Existing production baseline (already applied historically; do not re-run unless a new project):

- `supabase/schema.sql` or the previously applied `patch-*.sql` chain
- `supabase/patch-designer-contact-service-areas.sql` (already live — do not re-run)
- `supabase/patch-marketplace-admin-approval.sql` (already live — do not re-run)

Then, in a **staging** SQL editor, entire files from line 1, nothing highlighted:

1. Optional read-only check: `supabase/tests/staging-preflight.sql`
2. `supabase/patch-designer-private-details.sql`
   - Idempotent. Re-run fills missing private rows and leftover public phones, but
     does **not** overwrite a non-empty `designer_private_details.phone`.
   - `REVOKE SELECT` runs before column `GRANT`s.
3. `supabase/patch-testimonial-view-lockdown.sql`
   - Rebuilds `marketplace_testimonials` and `testimonials_for_participants` as
     non-auto-updatable (subquery in `FROM`) with SELECT-only grants.
4. `supabase/patch-function-execute-lockdown.sql` — creates
   `public.consume_rate_limit(text, integer, integer)`
5. `supabase/patch-admin-aal-rls.sql`

Limiter signature for `to_regprocedure` is **three** arguments:

```sql
select to_regprocedure('public.consume_rate_limit(text,integer,integer)');
```

Do not use `(text,text,integer,integer)`.

## After patches (steps 2–3)

1. `supabase/tests/security-hardening.sql` (staging only; ends in `ROLLBACK`)
2. Grant boundary — all five must be `false`:

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

3. Views — `is_updatable` and `is_insertable_into` must be `NO` for
   `marketplace_designers`, `marketplace_testimonials`, and
   `testimonials_for_participants`. The security test raises if they are not.
4. Limiter SQL check is inside the security test (allow two hits, deny the third).
   Application states are covered by `src/lib/security/rate-limit.test.ts`:
   - `true` → protected callback runs
   - `false` → HTTP 429 `rate_limited`; callback does not run
   - missing / error / invalid / `NULL` → HTTP 503 `rate_limit_unavailable`; callback does not run

## Application deploy (step 4)

Deploy from `security/hardening-pass` only after step 1 created
`consume_rate_limit`. Then complete steps 5–7.

## Rollback order (reverse)

1. `supabase/rollback-admin-aal-rls.sql`
2. `supabase/rollback-function-execute-lockdown.sql`
3. `supabase/rollback-testimonial-view-lockdown.sql`
4. `supabase/rollback-designer-private-details.sql`

Rollback restores previous grants/policies. It does **not** delete
`designer_private_details` rows.

## Expected Security Advisor findings (do not suppress without this note)

- `marketplace_testimonials` as SECURITY DEFINER. Required so signed-out visitors can read public-safe testimonial columns after anon SELECT was revoked on `testimonials`. The view is read-only, projects no private_feedback/customer_id/project_id, and writes are revoked.
- RLS helper functions (`is_admin`, `current_designer_profile_id`, …) as SECURITY DEFINER. They read `auth.uid()` and `public.users.role`, not client-editable user metadata. EXECUTE is granted because policies invoke them.
- Leaked-password protection is a dashboard Auth setting, not SQL. Enable it using `docs/security/leaked-password-protection.md`.
