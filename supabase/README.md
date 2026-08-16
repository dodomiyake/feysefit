# Supabase setup for FeyseFit (Next.js web MVP)

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Copy the **Project URL** and **anon public key** from Settings → API.

## 2. Apply the database schema

**New Supabase project:**

`supabase/schema.sql` is the historical base schema; it is not the complete
current production baseline by itself. Apply the verified empty-project sequence
in `docs/security/STAGING-BASELINE.md`. That document includes
`schema.sql`, `storage.sql`, bootstrap reconciliation, the historical feature
patches, and the security hand-off order.

Do not copy production users or application rows into staging. Skip
`supabase/seed.sql` for security verification.

If a migration reports a missing relation or column, stop. Do not guess the next
patch or bypass the prerequisite; compare the target against the documented
baseline and production metadata first.

## 3. Demo data (optional)

**Skip `seed.sql` if you want real accounts only.** The app creates users and profiles through signup.

### Real-data flow

1. In Supabase **Authentication → Providers → Email**, turn off **Confirm email** for local testing (or confirm each signup from your inbox).
2. Run **`supabase/update-auth-trigger.sql`** in the SQL Editor (creates profiles on signup).
3. Run `storage.sql` if you use image uploads.
4. Run **`patch-customer-profile-image.sql`** if customer profile photos fail to save.
5. Run **`patch-storage-message-files.sql`** for PDF/document message attachments (keeps the bucket private). Then run **`patch-storage-security.sql`** after steps 19–21 for authoritative private-read policies, short-lived display signing in the app, and admin-only `measurement-guides` uploads.
6. **Designer:** `/signup` → choose Designer → complete `/onboarding/designer`.
7. **Customer (invited):** Designer goes to `/invite` → enters customer email → invitation email is sent with link (`/join/FF-XXXXXX`) → customer signs up and is linked automatically. Configure `RESEND_API_KEY` in `.env` (see below). Run `patch-invite-link.sql` and **`patch-invite-accept.sql`** in the SQL Editor so invite acceptance creates the designer–customer link.
8. **Customer (marketplace):** Customer signs up as direct → browses `/marketplace` → sends an enquiry. Run **`patch-marketplace-enquiries.sql`**, then **`patch-marketplace-enquiry-conversations.sql`**, then **`patch-marketplace-enquiry-live-unlink.sql`** after the security follow-up patches. The designer accepts the enquiry for discussion and sends a first reply without linking. Both participants continue in the limited pre-link thread with live bell notifications. The client confirms the latest agreement, the designer explicitly finalises it to activate only that pair, and project creation remains a separate action in `/enquiries`. Unlinking archives the accepted enquiry as `unlinked`. Do not use `patch-marketplace-request-rls.sql` for a current deployment.
9. **Customer fabric picks:** Run **`patch-customer-fabric-selection.sql`** so customers can save primary fabric, secondary material, and lining on their project.
9. **Projects:** Designer creates a project at `/projects/new` for a linked customer.
10. **Live messaging:** Run `patch-messaging-realtime.sql` in the SQL Editor so new messages appear instantly in `/messages` without refreshing.
11. **Project timeline notifications:** Run `patch-projects-realtime.sql` so customers get bell notifications when a designer updates the production timeline or shares progress photos.
12. **Designer notifications:** Run `patch-designer-update.sql` so designers get bell alerts when clients submit measurements or upload style references.
13. **Customer measurement timeline sync:** Run `patch-measurement-submit.sql` so measurement submissions update the project timeline (RLS blocks direct customer updates on `projects`).
14. **Admin profile photos:** Run `patch-user-profile-image.sql` so admin accounts can save a profile photo in Settings.
15. **Admin live dashboard:** Run `patch-admin-realtime.sql` so admin stats, sidebar badges, and bell notifications update when unlink requests, marketplace approvals, reports, or new signups arrive.
16. **Appointments & availability:** Run **`patch-appointments-setup.sql`** so designers can schedule appointments, publish calendar availability, and customers can book slots. If you only need the latest calendar dates table, run `patch-appointment-dates.sql` after the earlier appointment patches.
17. **Customer slot booking:** Run **`patch-appointment-customer-booking.sql`** so customers can book a published slot as confirmed without a designer approval step.
18. **Admin studio ops visibility:** Run **`patch-admin-studio-ops.sql`** so admins can view walk-in studio clients and appointments in the admin portal.
19. **RLS anti-poaching / marketplace hardening:** Run **`patch-rls-anti-poaching.sql`**, then re-run **`patch-customer-delivery-confirm.sql`** so delivery confirmation can still set `has_concluded_project`. This locks designer relationship inserts, private storage reads, public testimonials, marketplace self-approve, and related gaps.
20. **RLS enabled on every user-data table:** Run **`patch-enable-rls-all-tables.sql`** (idempotent). Use after bootstrap or any incomplete patch apply to guarantee `ENABLE` + `FORCE ROW LEVEL SECURITY` on all known public tables.
21. **Designer access requires authorised relationship:** Run **`patch-designer-authorized-relationship.sql`** so designers can only read/write platform customer data, projects, messages, measurements, and related artifacts when an **active** `designer_customer_relationships` row exists (studio walk-ins stay designer-owned).
22. **Storage security (authoritative):** Run **`patch-storage-security.sql`** after steps 19–21. Forces private buckets private, restricts private object SELECT to owner / admin / project-linked parties (paths `{userId}/{projectId}/…` when scoped), and makes `measurement-guides` inserts admin-only. Prefer this over older `patch-storage-private.sql` alone.
23. **Multi-factor authentication (TOTP):** In the Supabase Dashboard → **Authentication → Providers / Multi-Factor**, enable **TOTP (Authenticator app)**. Do not rely on SMS as the only MFA option. App policy: admins must enroll; designers are strongly encouraged; customers optional. Enrolled users are challenged to AAL2 after login; bulk exports and other `ensureReauth` actions require an authenticator code when MFA is enabled.
24. **Security event log:** Run **`patch-security-events.sql`** so `/auth/security-event` can persist hashed auth abuse events (failed logins, cooldowns, reset/resend limits). Admins can SELECT; clients insert only via `log_security_event`.
25. **Brute-force / CAPTCHA (production):** In Supabase → **Authentication → Attack Protection**, enable **CAPTCHA** with provider **Cloudflare Turnstile**. Paste the Turnstile **secret** key there (must match the widget whose **site** key is in `NEXT_PUBLIC_TURNSTILE_SITE_KEY`). Also allow `localhost` (and your production domain) in the Cloudflare Turnstile widget hostnames. The app always shows Turnstile when the site key is set; tokens are single-use and reset after each attempt. Password-reset and verification-resend are limited with generic success messages.
26. **Account security screen:** Run **`patch-account-security.sql`** after step 24. Adds `users.password_changed_at`, the user-facing `account_activity` feed (redacted IP / coarse device hints), and RPCs `log_account_activity` + `mark_password_changed`. Open **Settings → Account security** (`/settings/security`) for password, MFA, sessions (this / others / all), and activity.
27. **JWT lifetime (production):** In Supabase → **Project Settings → Authentication → JWT expiry**, keep access-token lifetime relatively short (about **3600 seconds / 1 hour** recommended). Session sign-out scopes revoke refresh tokens immediately, but access JWTs can remain valid until they expire — a short lifetime limits the window after “sign out all devices”.
28. **Approve unlink clears designer link:** Run **`patch-approve-unlink-clear-link.sql`** so admin approve always deactivates `designer_customer_relationships`, heals clients stuck with `unlink_status = approved` while still linked, and adds safe RPCs / RLS for deactivating a link.
29. **Historical marketplace link RPC:** `patch-marketplace-link-rpc.sql` is superseded by `patch-marketplace-enquiries.sql` plus `patch-marketplace-enquiry-conversations.sql`. Replies never link accounts. After the client confirms the latest discussion, the designer finalises the agreement; the current flow never switches off the client’s other legitimate designer relationships.
30. **Designer create project for linked client:** Run **`patch-designer-project-create-rls.sql`** so project inserts work when a designer owns more than one profile UUID (avoids LIMIT 1 mismatch with `current_designer_profile_id()`).
31. **Multi-garment projects:** Run **`patch-project-items.sql`** so a single project can contain multiple clothing items (each with its own status, deadline, fabric, and measurements). Existing projects are backfilled with one item from their legacy fields.
32. **Unlink archive & messaging guard:** Run **`patch-project-status-unlink-terminal.sql`** first, then **`patch-unlink-archive-messaging.sql`** (after the unlink and relationship patches). Blocks unlink while active projects remain, archives conversations read-only on approve (messages are never deleted), and lets designers retain historical project/message access without live profile or measurement access.
33. **Post-signup onboarding status:** Run **`patch-onboarding-status.sql`** so the app tracks onboarding progress, terms acceptance, and designer setup checklist. Incomplete users resume role-based onboarding after email verify / login instead of jumping straight to the dashboard.
34. **Admin-approved marketplace visibility:** Run **`patch-marketplace-admin-approval.sql`** after `patch-rls-anti-poaching.sql`. A designer remains hidden while pending or declined; only a listing explicitly verified and approved by an admin can set `marketplace_live = true`. The patch also removes stale unapproved live flags and hides pending portfolio rows from public reads.

### Optional demo users (only if you run `seed.sql`)

In Supabase Authentication → Users, create:

| Email | Password | User metadata (`raw_user_meta_data`) |
|-------|----------|--------------------------------------|
| `adaeze@adaezeatelier.com` | `demo123` | `{ "name": "Adaeze Okonkwo", "role": "designer" }` |
| `chioma.a@email.com` | `demo123` | `{ "name": "Chioma Adeyemi", "role": "customer" }` |
| `admin@feysefit.app` | `demo123` | `{ "name": "FeyseFit Admin", "role": "admin" }` |

Then run `seed.sql` for sample projects and messages.

### Admin account (no seed)

Admins are not created through `/signup` (only designer and customer). To add yourself:

1. **Authentication → Users → Add user**
   - Turn on **Auto Confirm User**
   - User metadata: `{"name": "Your Name", "role": "admin"}`
2. Edit `supabase/create-admin.sql` with your email and name, then run it in the SQL Editor  
   (ensures `public.users.role` is `admin` even if the trigger already ran)
3. Log in at `/login/admin` with that email and password → `/dashboard/admin`
4. Run `supabase/patch-admin-team.sql` so you can grant access to employees from the portal

To promote an existing account, use **Admin → Admin team** in the portal, or run `create-admin.sql` with that user’s email.

### Grant access to employees

1. Run `supabase/patch-admin-team.sql` once (if you have not re-run full `schema.sql` since this feature was added).
2. In the admin portal, open **Admin team** (`/dashboard/admin/team`).
3. Enter the employee’s email and click **Grant access** (they must already have a FeyseFit account).
4. They sign in at `/login/admin` with their email and password.

For brand-new employees with no account yet: create them in **Supabase → Authentication → Add user** (auto-confirm on), then grant access on the Admin team page.

## 4. Configure the Next.js app

In `feysefit/.env`:

```env
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Disable the legacy Prisma API when using Supabase:

```env
NEXT_PUBLIC_USE_API=false
```

### Invitation emails (Resend)

Invitation links are emailed when a designer sends an invite from `/invite`. Add to `.env`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=re_xxxxxxxx
INVITE_EMAIL_FROM="FeyseFit <onboarding@resend.dev>"
```

1. Create a free account at [resend.com](https://resend.com) and copy your API key.
2. **Local testing:** use `INVITE_EMAIL_FROM="FeyseFit <onboarding@resend.dev>"`. Resend only delivers to **your own Resend account email** in this mode—use that address as the customer email when testing, or copy the invite link manually.
3. **Production:** verify [feysefit.com](https://resend.com/domains) in Resend (add DNS records at your registrar), then set:
   ```env
   INVITE_EMAIL_FROM="FeyseFit <invites@feysefit.com>"
   NEXT_PUBLIC_APP_URL=https://feysefit.com
   ```

## 5. Storage buckets

`supabase/storage.sql` creates:

- **Public:** `avatars`, `designer-portfolios` (marketplace / portfolio / public testimonial photos), `measurement-guides` (admin-only uploads after `patch-storage-security.sql`)
- **Private:** `customer-inspiration`, `project-references`, `project-progress`, `message-attachments`

Uploads are scoped to `{auth.uid()}/...` or `{auth.uid()}/{project_id}/...`. The app persists durable public-shaped object URLs and mints **short-lived signed URLs (5 minutes)** only for display of private objects.

**Always run `patch-storage-security.sql` last** among storage patches. Do not leave project/message buckets world-readable. Older `patch-storage-message-files.sql` used to set private buckets public — that file is fixed to keep message-attachments private; still run `patch-storage-security.sql` to enforce SELECT policies.

## Architecture

```text
Next.js App (AppContext + lib/services/*)
        ↓
@supabase/supabase-js (browser) + @supabase/ssr (middleware)
        ↓
Supabase Auth + Postgres + RLS + Storage
```

The Expo/mobile app can use the **same Supabase project** and `lib/services` patterns later.
