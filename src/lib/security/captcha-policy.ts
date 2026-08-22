/**
 * Client-safe CAPTCHA policy. The Turnstile *secret* is never read here.
 * Production fails closed when the public site key is missing.
 */

export function getTurnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || null;
}

export function isTurnstileConfigured(): boolean {
  return Boolean(getTurnstileSiteKey());
}

export function captchaProductionBlockReason(): string | null {
  if (process.env.NODE_ENV !== "production") return null;
  if (!isTurnstileConfigured()) {
    return "Security check is not configured.";
  }
  return null;
}

export function requireCaptchaToken(captchaToken?: string | null): string | null {
  const production = captchaProductionBlockReason();
  if (production) return production;
  if (isTurnstileConfigured() && !captchaToken?.trim()) {
    return "Complete the security check to prove you are human, then try again.";
  }
  if (process.env.NODE_ENV === "production" && !captchaToken?.trim()) {
    return "Complete the security check to prove you are human, then try again.";
  }
  return null;
}

/** Single-use helper: return the current token and a cleared next value. */
export function consumeSingleUseToken(token: string | null | undefined): {
  token: string | null;
  remaining: null;
} {
  const trimmed = token?.trim() || null;
  return { token: trimmed, remaining: null };
}
