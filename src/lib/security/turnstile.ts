import "server-only";

import { isProductionRuntime } from "@/lib/security/secrets";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileVerifyFailure =
  | "missing_secret"
  | "missing_token"
  | "invalid"
  | "expired"
  | "reused"
  | "unavailable";

export type TurnstileVerifyResult =
  | { ok: true }
  | { ok: false; reason: TurnstileVerifyFailure };

function mapErrorCodes(codes: string[]): TurnstileVerifyFailure {
  if (codes.includes("timeout-or-duplicate")) return "reused";
  if (codes.includes("invalid-input-response")) return "invalid";
  if (codes.includes("missing-input-response")) return "missing_token";
  if (codes.includes("expired-input-response")) return "expired";
  if (codes.includes("missing-input-secret") || codes.includes("invalid-input-secret")) {
    return "missing_secret";
  }
  return "invalid";
}

/**
 * Server-only Turnstile siteverify. The secret must never be NEXT_PUBLIC_*.
 *
 * Pre-auth GoTrue (sign-in/up/reset/resend) validates captchaToken itself when
 * Attack Protection CAPTCHA is enabled. Do not call this helper *and* pass the
 * same token to GoTrue — Cloudflare tokens are single-use.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  options?: {
    secret?: string | null;
    fetchImpl?: typeof fetch;
    remoteIp?: string;
  }
): Promise<TurnstileVerifyResult> {
  const secret = options?.secret ?? process.env.TURNSTILE_SECRET_KEY?.trim() ?? "";
  const trimmed = token?.trim() ?? "";
  if (!secret) {
    if (isProductionRuntime()) return { ok: false, reason: "missing_secret" };
    return { ok: false, reason: "missing_secret" };
  }
  if (!trimmed) return { ok: false, reason: "missing_token" };

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", trimmed);
  if (options?.remoteIp && options.remoteIp !== "unknown") {
    body.set("remoteip", options.remoteIp);
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) return { ok: false, reason: "unavailable" };
    const payload = (await response.json()) as {
      success?: unknown;
      "error-codes"?: unknown;
    };
    if (payload.success === true) return { ok: true };
    const codes = Array.isArray(payload["error-codes"])
      ? payload["error-codes"].filter((code): code is string => typeof code === "string")
      : [];
    return { ok: false, reason: mapErrorCodes(codes) };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export function publicTurnstileError(reason: TurnstileVerifyFailure): string {
  if (reason === "missing_token" || reason === "invalid" || reason === "expired" || reason === "reused") {
    return "Security check expired or already used. Complete a fresh check, then try once.";
  }
  return "This request could not be completed. Try again.";
}
