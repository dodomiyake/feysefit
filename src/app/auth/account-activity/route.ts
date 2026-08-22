import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import type { Json } from "@/lib/types/database";
import {
  ACCOUNT_ACTIVITY_TYPES,
  type AccountActivityType,
} from "@/lib/account-activity";
import { NextResponse, type NextRequest } from "next/server";
import { clientIpFromHeaders, runSensitiveHttpAction } from "@/lib/security/rate-limit";
import { sanitizeEventMeta } from "@/lib/security/event-meta";
import { redactForLogs } from "@/lib/security/redact";

const ALLOWED = new Set<string>(ACCOUNT_ACTIVITY_TYPES);

/**
 * POST /auth/account-activity
 * Body: { eventType, meta? }
 * Server derives user, IP and user-agent. Caller email/IP are ignored.
 * RPC failure does not return success.
 */
export async function POST(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  const requestId = crypto.randomUUID();

  let eventType = "";
  let meta: Json = {};
  try {
    const body = (await request.json()) as {
      eventType?: unknown;
      meta?: unknown;
    };
    eventType = typeof body.eventType === "string" ? body.eventType.trim() : "";
    meta = sanitizeEventMeta(body.meta);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!ALLOWED.has(eventType)) {
    return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: "unavailable", requestId }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Unauthenticated events are not attributed to an account (no email lookup).
    return NextResponse.json({ ok: true, recorded: false });
  }

  const userAgent = request.headers.get("user-agent");

  const gated = await runSensitiveHttpAction("accountActivity", user.id, async () => {
    const admin = createServiceClient();
    const { error } = await admin.rpc("log_account_activity_server", {
      p_event_type: eventType as AccountActivityType,
      p_user_id: user.id,
      p_ip: ip,
      p_user_agent: userAgent,
      p_meta: meta,
    });
    if (error) {
      console.error(
        JSON.stringify({
          type: "account_activity_rpc_failed",
          requestId,
          message: redactForLogs(error.message),
        })
      );
      throw new Error("log_failed");
    }
    return true as const;
  });
  if (!gated.ok) return gated.response;

  return NextResponse.json({ ok: true, recorded: true });
}
