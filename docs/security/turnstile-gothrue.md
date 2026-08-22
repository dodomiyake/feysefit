# GoTrue / Turnstile pre-auth flow

This is the provider-validated CAPTCHA boundary. Browser UI checks are not sufficient.

## Flow

1. The browser loads Turnstile with `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public site key only).
2. On sign-in, signup, password reset, and verification resend the app sends `captchaToken` to **GoTrue** via `supabase-js` (`signInWithPassword`, `signUp`, `resetPasswordForEmail`, `resend`).
3. GoTrue validates the token with Cloudflare using the Turnstile **secret** stored in the Supabase dashboard (Authentication → Attack Protection → CAPTCHA). That secret is never shipped in the Next.js bundle and must never be `NEXT_PUBLIC_*`.
4. Cloudflare tokens are **single-use**. A second GoTrue call with the same token fails (`timeout-or-duplicate`). The app calls `consumeCaptchaToken()` so the widget resets after each attempt.
5. Do **not** also call `verifyTurnstileToken` in Next.js and then pass the same token to GoTrue. Siteverify consumes the token.

`src/lib/security/turnstile.ts` exists for Next.js routes that are *not* GoTrue. It uses server-only `TURNSTILE_SECRET_KEY`.

## Production fail-closed (app)

If `NODE_ENV=production` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is missing, login/signup/reset/resend are rejected. Attackers can still call GoTrue with the anon key, so dashboard CAPTCHA remains release-blocking.

## Required Supabase Auth settings (dashboard)

Release-blocking. Record evidence from the dashboard; do not claim these from SQL.

- CAPTCHA: Cloudflare Turnstile, secret matching the widget for `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- Rate limits: password sign-in, signup, recovery, and resend (use project defaults or stricter)
- Leaked-password protection: see `docs/security/leaked-password-protection.md`

## Local development

Site key may be unset. Captcha is not required unless the site key is present. Production builds without the site key fail closed.
