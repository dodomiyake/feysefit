# Supabase setup for FeyseFit (Next.js web MVP)

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Copy the **Project URL** and **anon public key** from Settings → API.

## 2. Apply the database schema

**New Supabase project — run one file only:**

1. Open `supabase/schema.sql` in the SQL Editor
2. Select **all** of it (Ctrl+A) and click **Run**

That creates enums, tables, column patches, auth trigger, and RLS in the correct order.

Then run:

2. `supabase/storage.sql` — storage buckets and upload policies
3. `supabase/seed.sql` — demo data (after creating auth users in step 3 below)

**Do not run `patch-*.sql` on an empty database** — those files assume tables already exist. If you see `relation "…" does not exist`, you skipped `schema.sql` and ran a patch first.

**If you already ran patches on an empty or broken DB:**

1. Run `supabase/patch-bootstrap.sql` (creates tables + enums + missing columns)
2. Run the **full** `supabase/schema.sql` again from the top

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
8. **Customer (marketplace):** Customer signs up as direct → browses `/marketplace` → requests a design. Run **`patch-marketplace-request-rls.sql`** so customers can link to marketplace designers and create enquiry projects.
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
25. **Brute-force / CAPTCHA (production):** In Supabase → **Authentication → Attack Protection**, review rate limits and enable **CAPTCHA** with **Cloudflare Turnstile**. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in `.env` (and the Turnstile secret in the Supabase dashboard). The app shows Turnstile after repeated failures and enforces temporary cooldowns; password-reset and verification-resend are also limited with generic success messages.
26. **Account security screen:** Run **`patch-account-security.sql`** after step 24. Adds `users.password_changed_at`, the user-facing `account_activity` feed (redacted IP / coarse device hints), and RPCs `log_account_activity` + `mark_password_changed`. Open **Settings → Account security** (`/settings/security`) for password, MFA, sessions (this / others / all), and activity.
27. **JWT lifetime (production):** In Supabase → **Project Settings → Authentication → JWT expiry**, keep access-token lifetime relatively short (about **3600 seconds / 1 hour** recommended). Session sign-out scopes revoke refresh tokens immediately, but access JWTs can remain valid until they expire — a short lifetime limits the window after “sign out all devices”.
28. **Approve unlink clears designer link:** Run **`patch-approve-unlink-clear-link.sql`** so admin approve always deactivates `designer_customer_relationships`, heals clients stuck with `unlink_status = approved` while still linked, and adds safe RPCs / RLS for deactivating a link.
29. **Marketplace client request link:** Run **`patch-marketplace-link-rpc.sql`** so clients can reliably link to a marketplace designer (and switch from a prior designer) when submitting a design request.
30. **Designer create project for linked client:** Run **`patch-designer-project-create-rls.sql`** so project inserts work when a designer owns more than one profile UUID (avoids LIMIT 1 mismatch with `current_designer_profile_id()`).

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
