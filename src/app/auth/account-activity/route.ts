import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";
import {
  ACCOUNT_ACTIVITY_TYPES,
  type AccountActivityType,
} from "@/lib/account-activity";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED = new Set<string>(ACCOUNT_ACTIVITY_TYPES);

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

/**
 * POST /auth/account-activity
 * Body: { eventType, email?, meta? }
 * Server redacts IP / user-agent before persistence.
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

  if (!ALLOWED.has(eventType)) {
    return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent");

  console.info(
    JSON.stringify({
      type: "account_activity",
      eventType,
      hasEmail: Boolean(email),
      at: new Date().toISOString(),
    })
  );

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("log_account_activity", {
      p_event_type: eventType as AccountActivityType,
      p_email: email ?? null,
      p_ip: ip,
      p_user_agent: userAgent,
      p_meta: meta,
    });
    if (error) {
      console.warn("log_account_activity rpc:", error.message);
    }
  } catch (error) {
    console.warn(
      "log_account_activity unavailable:",
      error instanceof Error ? error.message : error
    );
  }

  return NextResponse.json({ ok: true });
}
