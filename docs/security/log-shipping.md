# Centralized log shipping (Better Stack)

## What ships

Every place the app already logs a security-relevant or error event to
the console now goes through `shipLog()`
(`src/lib/security/log-shipper.ts`) instead of a raw `console.error`:

- `handleApiError` (`src/server/http.ts`) — every unhandled API error,
  covering all `src/app/api/v1/*` routes
- `POST /auth/security-event` — failures writing to `security_events`
- `POST /auth/account-activity` — failures writing to `account_activity`
  (including `concurrent_session_detected`, `login_succeeded`,
  `password_changed`, etc. — whatever the caller logs there)
- `POST /auth/uploads/promote` — malware detections, scan-unavailable
  rejections, and storage write failures
- `POST /auth/uploads/cleanup-quarantine` — cleanup failures
- `POST /auth/session/start` — concurrent-session-detection failures

`shipLog()` **always** logs locally first (unchanged from before this
existed — Vercel's own log capture still sees every line). Shipping to
Better Stack is additive and best-effort: a broken or unconfigured drain
never fails the request that triggered the log.

## What doesn't ship

This does not touch application data — no request bodies, no user
content, no full stack traces beyond what each call site already chose
to log (which is already redacted via `redactForLogs()` at each site that
handles free-text error messages). It ships exactly the same JSON object
that used to go to `console.error`, plus a timestamp.

## Setup

1. Create a Better Stack account and a new HTTP source
   (Sources → Connect source → HTTP/API).
2. Copy the source token, set it as `BETTERSTACK_SOURCE_TOKEN` in Vercel's
   Production environment variables (and locally in `.env` if you want to
   test shipping from dev — otherwise leave it unset locally).
3. Only set `BETTERSTACK_INGESTING_URL` if Better Stack's setup page shows
   a different ingesting host for your source; the default
   (`https://in.logs.betterstack.com`) covers most accounts.

## Alerting

Alert rules are configured in the Better Stack dashboard, not in this
repo — there's no API surface here for that. Worth setting up once the
source has real traffic:

- Repeated `login_failed` / `auth_rate_limited` from the same hashed
  identity or IP in a short window (credential stuffing / brute force).
- Any `upload_malware_detected` (should be rare; each one is a real
  detection worth knowing about immediately).
- A spike in `api_error` / `upload_promote_failed` / `quarantine_cleanup_failed`
  (infra or dependency regression).
- `concurrent_session_detection_failed` or `security_event_rpc_failed`
  recurring (usually points at a missing `SUPABASE_SERVICE_ROLE_KEY` or a
  DB patch that hasn't been applied yet).

## Why this integration point, not a wrapper around every route

The alternative — hooking `console.error`/`console.log` globally, or
wrapping every route handler — would ship noise the app doesn't already
choose to record (React render warnings, framework internals, unrelated
`console.log` debugging) and risks capturing something an individual
route deliberately didn't log (e.g. a value already scrubbed before the
`console.error` call). Routing through the existing, already-curated set
of `console.error(JSON.stringify(...))` call sites means Better Stack
receives exactly what a human reviewing server logs would already see —
nothing more, nothing less.
