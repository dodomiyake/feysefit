import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";
import {
  ACCOUNT_ACTIVITY_TYPES,
  type AccountActivityType,
} from "@/lib/account-activity";
import { NextResponse, type NextRequest } from "next/server";
import { clientIpFromHeaders, runSensitiveHttpAction } from "@/lib/security/rate-limit";

const ALLOWED = new Set<string>(ACCOUNT_ACTIVITY_TYPES);

/**
 * POST /auth/account-activity
 * Body: { eventType, email?, meta? }
 * Server redacts IP / user-agent before persistence.
 */
export async function POST(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);

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

  const gated = await runSensitiveHttpAction("accountActivity", ip, async () => {
    console.info(
      JSON.stringify({
        type: "account_activity",
        eventType,
        hasEmail: Boolean(email),
        at: new Date().toISOString(),
      })
    );

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
    return true as const;
  });
  if (!gated.ok) return gated.response;

  return NextResponse.json({ ok: true });
}
