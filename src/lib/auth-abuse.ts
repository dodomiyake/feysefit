/**
 * Client-side auth abuse protection: attempt tracking, cooldowns, and CAPTCHA thresholds.
 * Supabase still applies its own rate limits; this layer improves UX and triggers Turnstile
 * before hitting the provider when possible.
 */

export type AuthAbuseAction =
  | "login"
  | "signup"
  | "password_reset"
  | "verification_resend";

export type AuthAbuseSnapshot = {
  failures: number;
  windowStartedAt: number;
  cooldownUntil: number;
  requiresCaptcha: boolean;
  limited: boolean;
  retryAfterSeconds: number;
  message: string | null;
};

const STORAGE_PREFIX = "feysefit_auth_abuse_v1:";

const CONFIG: Record<
  AuthAbuseAction,
  {
    captchaAfterFailures: number;
    cooldownAfterFailures: number;
    cooldownMs: number;
    hardLimitCount: number;
    hardLimitWindowMs: number;
    hardLimitCooldownMs: number;
  }
> = {
  login: {
    captchaAfterFailures: 3,
    cooldownAfterFailures: 6,
    cooldownMs: 60_000,
    hardLimitCount: 12,
    hardLimitWindowMs: 15 * 60_000,
    hardLimitCooldownMs: 15 * 60_000,
  },
  signup: {
    captchaAfterFailures: 2,
    cooldownAfterFailures: 5,
    cooldownMs: 60_000,
    hardLimitCount: 8,
    hardLimitWindowMs: 15 * 60_000,
    hardLimitCooldownMs: 15 * 60_000,
  },
  password_reset: {
    captchaAfterFailures: 1,
    cooldownAfterFailures: 3,
    cooldownMs: 5 * 60_000,
    hardLimitCount: 5,
    hardLimitWindowMs: 60 * 60_000,
    hardLimitCooldownMs: 60 * 60_000,
  },
  verification_resend: {
    captchaAfterFailures: 1,
    cooldownAfterFailures: 3,
    cooldownMs: 5 * 60_000,
    hardLimitCount: 5,
    hardLimitWindowMs: 60 * 60_000,
    hardLimitCooldownMs: 60 * 60_000,
  },
};

type StoredBucket = {
  failures: number;
  windowStartedAt: number;
  cooldownUntil: number;
};

function storageKey(action: AuthAbuseAction, subject: string) {
  return `${STORAGE_PREFIX}${action}:${subject.trim().toLowerCase() || "_"}`;
}

function readBucket(action: AuthAbuseAction, subject: string): StoredBucket {
  if (typeof window === "undefined") {
    return { failures: 0, windowStartedAt: Date.now(), cooldownUntil: 0 };
  }
  try {
    const raw = window.localStorage.getItem(storageKey(action, subject));
    if (!raw) return { failures: 0, windowStartedAt: Date.now(), cooldownUntil: 0 };
    const parsed = JSON.parse(raw) as StoredBucket;
    return {
      failures: Number(parsed.failures) || 0,
      windowStartedAt: Number(parsed.windowStartedAt) || Date.now(),
      cooldownUntil: Number(parsed.cooldownUntil) || 0,
    };
  } catch {
    return { failures: 0, windowStartedAt: Date.now(), cooldownUntil: 0 };
  }
}

function writeBucket(action: AuthAbuseAction, subject: string, bucket: StoredBucket) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(action, subject), JSON.stringify(bucket));
  } catch {
    // Ignore quota / private mode failures — server/provider limits still apply.
  }
}

function pruneWindow(action: AuthAbuseAction, bucket: StoredBucket, now: number): StoredBucket {
  const cfg = CONFIG[action];
  if (now - bucket.windowStartedAt > cfg.hardLimitWindowMs) {
    return { failures: 0, windowStartedAt: now, cooldownUntil: bucket.cooldownUntil };
  }
  return bucket;
}

export function getAuthAbuseSnapshot(
  action: AuthAbuseAction,
  subject = ""
): AuthAbuseSnapshot {
  const cfg = CONFIG[action];
  const now = Date.now();
  const bucket = pruneWindow(action, readBucket(action, subject), now);
  const retryAfterMs = Math.max(0, bucket.cooldownUntil - now);
  const limited = retryAfterMs > 0;
  const requiresCaptcha =
    Boolean(getTurnstileSiteKey()) && bucket.failures >= cfg.captchaAfterFailures;

  let message: string | null = null;
  if (limited) {
    const secs = Math.ceil(retryAfterMs / 1000);
    message =
      secs >= 60
        ? `Too many attempts. Try again in ${Math.ceil(secs / 60)} minute(s).`
        : `Too many attempts. Try again in ${secs} second(s).`;
  }

  return {
    failures: bucket.failures,
    windowStartedAt: bucket.windowStartedAt,
    cooldownUntil: bucket.cooldownUntil,
    requiresCaptcha,
    limited,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    message,
  };
}

/** Guard before an auth attempt. Returns a user-facing error when blocked. */
export function assertAuthAttemptAllowed(
  action: AuthAbuseAction,
  subject = "",
  captchaToken?: string | null
): string | null {
  const snap = getAuthAbuseSnapshot(action, subject);
  if (snap.limited) return snap.message;
  if (snap.requiresCaptcha && !captchaToken?.trim()) {
    return "Complete the security check to continue.";
  }
  return null;
}

export function recordAuthFailure(action: AuthAbuseAction, subject = ""): AuthAbuseSnapshot {
  const cfg = CONFIG[action];
  const now = Date.now();
  let bucket = pruneWindow(action, readBucket(action, subject), now);
  bucket = {
    ...bucket,
    failures: bucket.failures + 1,
  };

  if (bucket.failures >= cfg.hardLimitCount) {
    bucket.cooldownUntil = now + cfg.hardLimitCooldownMs;
  } else if (bucket.failures >= cfg.cooldownAfterFailures) {
    // Escalating short cooldowns after repeated failures
    const multiplier = Math.min(4, bucket.failures - cfg.cooldownAfterFailures + 1);
    bucket.cooldownUntil = now + cfg.cooldownMs * multiplier;
  }

  writeBucket(action, subject, bucket);
  return getAuthAbuseSnapshot(action, subject);
}

export function recordAuthSuccess(action: AuthAbuseAction, subject = "") {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(action, subject));
  } catch {
    // ignore
  }
}

export function getTurnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || null;
}

export function isTurnstileConfigured(): boolean {
  return Boolean(getTurnstileSiteKey());
}

export const GENERIC_AUTH_REQUEST_MESSAGE =
  "If an account exists for that email, you will receive a message shortly.";

export const GENERIC_AUTH_RESEND_MESSAGE =
  "If that email needs verification, a new link has been sent.";
