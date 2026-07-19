import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";
import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

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

/** Very small in-memory throttle per IP for this serverless instance. */
const ipBuckets = new Map<string, { count: number; resetAt: number }>();
const IP_LIMIT = 60;
const IP_WINDOW_MS = 60_000;

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function allowIp(ip: string): boolean {
  const now = Date.now();
  const current = ipBuckets.get(ip);
  if (!current || now > current.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return true;
  }
  if (current.count >= IP_LIMIT) return false;
  current.count += 1;
  return true;
}

function hashEmail(email: string | undefined | null): string | null {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;
  const salt = process.env.SECURITY_EVENT_SALT?.trim() || "feysefit";
  return createHash("sha256").update(`${salt}:${normalized}`).digest("hex");
}

/**
 * POST /auth/security-event
 * Body: { eventType: string, email?: string, meta?: Record<string, unknown> }
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!allowIp(ip)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

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
    if (body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)) {
      meta = body.meta as Json;
    }
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!ALLOWED_EVENTS.has(eventType)) {
    return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });
  }

  const emailHash = hashEmail(email);
  const userAgent = request.headers.get("user-agent");

  // Structured log always (even if DB patch not applied yet).
  console.info(
    JSON.stringify({
      type: "security_event",
      eventType,
      emailHash,
      ip,
      meta,
      at: new Date().toISOString(),
    })
  );

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("log_security_event", {
      p_event_type: eventType,
      p_email_hash: emailHash,
      p_ip: ip,
      p_user_agent: userAgent,
      p_meta: meta,
    });
    if (error) {
      // Table/function may not be deployed yet — console log remains source of truth.
      console.warn("log_security_event rpc:", error.message);
    }
  } catch (error) {
    console.warn(
      "log_security_event unavailable:",
      error instanceof Error ? error.message : error
    );
  }

  return NextResponse.json({ ok: true });
}
