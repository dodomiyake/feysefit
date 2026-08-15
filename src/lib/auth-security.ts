/**
 * FeyseFit Authentication Security MVP
 * - Idle timeout (inactivity) — enforced in middleware + /auth/activity (not client-only)
 * - Absolute session lifetime
 * - Optional "Keep me signed in" (longer absolute lifetime)
 * Does NOT force logout merely because the browser was closed.
 */

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const IDLE_WARNING_MS = 2 * 60 * 1000; // warn 2 minutes before lock

/** Absolute session caps (OWASP/NIST overall session timeout). */
export const ABSOLUTE_SESSION_MS = {
  temporary: 24 * 60 * 60 * 1000, // 24 hours without "Keep me signed in"
  remembered: 30 * 24 * 60 * 60 * 1000, // 30 days with "Keep me signed in"
} as const;

export const SESSION_STARTED_COOKIE = "feysefit_session_started";
export const LAST_ACTIVITY_COOKIE = "feysefit_last_activity";
export const REMEMBER_COOKIE = "feysefit_remember";
/** Step-up reauthentication timestamp (httpOnly). */
export const REAUTH_COOKIE = "feysefit_reauthenticated_at";
/** Sensitive actions require reauth within this window. */
export const REAUTH_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

export const GENERIC_LOGIN_ERROR = "The email or password you entered is incorrect.";

/** NIST-aligned minimum; passphrases and password-manager secrets are both valid. */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 256;

const ACTIVITY_TOUCH_THROTTLE_MS = 15_000;
let lastActivityTouchMs = 0;

export function isPasswordStrongEnough(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH;
}

export function getAbsoluteSessionMs(remember: boolean) {
  return remember ? ABSOLUTE_SESSION_MS.remembered : ABSOLUTE_SESSION_MS.temporary;
}

export function getSupabaseCookieOptions(remember = false) {
  const maxAgeSeconds = Math.floor(getAbsoluteSessionMs(remember) / 1000);
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
  };
}

/** Absolute + idle clocks — httpOnly so the browser cannot forge expiry resets. */
export function getSessionClockCookieOptions(remember = false) {
  return {
    ...getSupabaseCookieOptions(remember),
    httpOnly: true,
  };
}

/** Remember preference stays readable by the client for Supabase cookie maxAge. */
export function getRememberCookieOptions(remember = false) {
  return {
    ...getSupabaseCookieOptions(remember),
    httpOnly: false,
  };
}

/** Short-lived step-up reauth marker (httpOnly). */
export function getReauthCookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(REAUTH_MAX_AGE_MS / 1000),
    httpOnly: true,
  };
}

export type ReauthValidity =
  | { ok: true; reauthenticatedAt: number; expiresAt: number }
  | { ok: false; reason: "missing" | "expired" };

export function evaluateRecentReauth(input: {
  reauthRaw: string | undefined;
  nowMs?: number;
  maxAgeMs?: number;
}): ReauthValidity {
  const now = input.nowMs ?? Date.now();
  const maxAge = input.maxAgeMs ?? REAUTH_MAX_AGE_MS;
  const reauthenticatedAt = Number(input.reauthRaw ?? "");
  if (!Number.isFinite(reauthenticatedAt) || reauthenticatedAt <= 0) {
    return { ok: false, reason: "missing" };
  }
  const expiresAt = reauthenticatedAt + maxAge;
  if (now > expiresAt) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, reauthenticatedAt, expiresAt };
}

function cookieSecureFlag() {
  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "production" ? "; Secure" : "";
  }
  return window.location.protocol === "https:" ? "; Secure" : "";
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${cookieSecureFlag()}`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${cookieSecureFlag()}`;
}

export function isRememberSessionEnabled(): boolean {
  return readCookie(REMEMBER_COOKIE) === "1";
}

/** Call after successful login to start idle + absolute session clocks (server-owned). */
export async function startAppSession(remember: boolean) {
  const maxAge = Math.floor(getAbsoluteSessionMs(remember) / 1000);
  writeCookie(REMEMBER_COOKIE, remember ? "1" : "0", maxAge);
  lastActivityTouchMs = Date.now();
  try {
    await fetch("/auth/session/start", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remember }),
    });
  } catch {
    // Middleware will seed clocks on the next authenticated navigation if this fails.
  }
}

/**
 * Record intentional user activity on the server (httpOnly last-activity cookie).
 * Throttled so mouse/scroll storms do not spam the route.
 */
export function touchAppSessionActivity() {
  const now = Date.now();
  if (now - lastActivityTouchMs < ACTIVITY_TOUCH_THROTTLE_MS) return;
  lastActivityTouchMs = now;
  void fetch("/auth/activity", {
    method: "POST",
    credentials: "same-origin",
  }).catch(() => {
    // Ignore network blips; middleware still enforces expiry on navigation.
  });
}

export function clearAppSessionMarkers() {
  clearCookie(REMEMBER_COOKIE);
  clearCookie(SESSION_STARTED_COOKIE);
  clearCookie(LAST_ACTIVITY_COOKIE);
  clearCookie(REAUTH_COOKIE);
}

export type SessionValidity =
  | { ok: true; remember: boolean }
  | { ok: false; reason: "idle" | "absolute" };

/** Server/middleware-friendly session clock validation. */
export function evaluateSessionClocks(input: {
  nowMs?: number;
  rememberRaw: string | undefined;
  startedRaw: string | undefined;
  lastActivityRaw: string | undefined;
}): SessionValidity {
  const now = input.nowMs ?? Date.now();
  const remember = input.rememberRaw === "1";
  const started = Number(input.startedRaw ?? "");
  const lastActivity = Number(input.lastActivityRaw ?? "");

  // Legacy sessions without clocks — allow once; middleware will stamp cookies.
  if (!Number.isFinite(started) || !Number.isFinite(lastActivity)) {
    return { ok: true, remember };
  }

  if (now - lastActivity > IDLE_TIMEOUT_MS) {
    return { ok: false, reason: "idle" };
  }
  if (now - started > getAbsoluteSessionMs(remember)) {
    return { ok: false, reason: "absolute" };
  }
  return { ok: true, remember };
}

export function clearSupabaseAuthCookies(
  cookieNames: string[],
  setCookie: (name: string, value: string, options: Record<string, unknown>) => void
) {
  const base = {
    path: "/",
    maxAge: 0,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
  for (const name of cookieNames) {
    setCookie(name, "", base);
  }
  for (const name of [
    REMEMBER_COOKIE,
    SESSION_STARTED_COOKIE,
    LAST_ACTIVITY_COOKIE,
    REAUTH_COOKIE,
  ]) {
    setCookie(name, "", { ...base, httpOnly: name !== REMEMBER_COOKIE });
  }
}

export function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && (name.includes("auth-token") || name.includes("auth"));
}

/** Map provider auth errors to a generic login message when appropriate. */
export function toGenericLoginError(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("invalid login") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("email not confirmed") ||
    normalized.includes("invalid email or password") ||
    normalized.includes("user not found") ||
    normalized.includes("wrong password")
  ) {
    return GENERIC_LOGIN_ERROR;
  }
  // Still hide email-existence leakage for confirmation messaging during login attempts
  if (normalized.includes("confirm") && normalized.includes("email")) {
    return GENERIC_LOGIN_ERROR;
  }
  return message;
}
