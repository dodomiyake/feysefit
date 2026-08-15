# Enable leaked-password protection (Supabase Auth)

FeyseFit requires a minimum password length of 12 characters and allows long passphrases. That is necessary but not sufficient: **HaveIBeenPwned / leaked-password protection must be enabled in the Supabase project**.

This cannot be turned on from application SQL. A project owner must enable it in the dashboard.

## Steps

1. Open the Supabase project (staging first, then production).
2. Go to **Authentication → Attack Protection** (or **Auth → Providers / Settings**, depending on dashboard version).
3. Enable **Leaked password protection**.
4. Confirm new sign-up and password-change attempts that use known-breached passwords are rejected.
5. Record the change in the operational log. Do not store real passwords or breach corpora in this repository.

Until this is enabled, the application password policy still blocks short secrets, but it cannot detect passwords that already appeared in public dumps.

## Release-blocking checklist

- [ ] Staging: Authentication → Attack Protection → Leaked password protection = on
- [ ] Staging: Advisor no longer reports leaked password protection as an error
- [ ] Production: same dashboard setting enabled after the staging confirmation
- [ ] Record the dashboard confirmation (project ref + date) in the ops log. Do not store credentials.

Do not claim this control is enabled until the dashboard or Advisor confirms it.

Related production settings that must stay on:

- Email confirmation / verification
- CAPTCHA / Cloudflare Turnstile (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`) for signup, password reset, verification resend, and login after abuse thresholds
- Session idle timeout, absolute timeout, and revocation already implemented in `src/lib/auth-security.ts`
