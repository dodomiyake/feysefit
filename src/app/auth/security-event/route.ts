import { createServiceClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import type { Json } from "@/lib/types/database";
import { hmacSha256Hex } from "@/lib/security/hmac";
import { getSecurityEventHmacSecret } from "@/lib/security/secrets";
import { sanitizeEventMeta } from "@/lib/security/event-meta";
import { NextResponse, type NextRequest } from "next/server";
import { clientIpFromHeaders, runSensitiveHttpAction } from "@/lib/security/rate-limit";
import { redactForLogs } from "@/lib/security/redact";

const ALLOWED_EVENTS = new Set([
  "login_failed",
  "login_succeeded",
  "login_cooldown",
  "signup_failed",
  "signup_succeeded",
  "password_reset_requested",
  "password_reset_limited",
  "verification_resend",
  "verification_resend_limited",
  "captcha_required",
  "captcha_failed",
  "auth_rate_limited",
]);

async function hashEmail(email: string | undefined | null): Promise<string | null> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;
  const secret = getSecurityEventHmacSecret();
  if (!secret) return null;
  return hmacSha256Hex(secret, `email:${normalized}`);
}

/**
 * POST /auth/security-event
 * Body: { eventType: string, email?: string, meta?: Record<string, unknown> }
 * IP is derived server-side. RPC failure does not return success.
 */
export async function POST(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  const requestId = crypto.randomUUID();

  let eventType = "";
  let email: string | undefined;
  let meta: Json = {};
  try {
    const body = (await request.json()) as {
      eventType?: unknown;
      email?: unknown;
      meta?: unknown;
    };
    eventType = typeof body.eventType === "string" ? body.eventType.trim() : "";
    email = typeof body.email === "string" ? body.email : undefined;
    meta = sanitizeEventMeta(body.meta);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!ALLOWED_EVENTS.has(eventType)) {
    return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });
  }

  const emailHash = await hashEmail(email);
  if (email && !emailHash) {
    return NextResponse.json({ ok: false, error: "unavailable", requestId }, { status: 503 });
  }
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: "unavailable", requestId }, { status: 503 });
  }

  const userAgent = request.headers.get("user-agent");

  const gated = await runSensitiveHttpAction("securityEvent", ip, async () => {
    const admin = createServiceClient();
    const { error } = await admin.rpc("log_security_event", {
      p_event_type: eventType,
      p_email_hash: emailHash,
      p_ip: ip,
      p_user_agent: userAgent,
      p_meta: meta,
    });
    if (error) {
      console.error(
        JSON.stringify({
          type: "security_event_rpc_failed",
          requestId,
          message: redactForLogs(error.message),
        })
      );
      throw new Error("log_failed");
    }
    return true as const;
  });
  if (!gated.ok) return gated.response;

  return NextResponse.json({ ok: true });
}
