import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import {
  getRememberCookieOptions,
  getReauthCookieOptions,
  getSessionClockCookieOptions,
  getSupabaseCookieOptions,
  LAST_ACTIVITY_COOKIE,
  REAUTH_COOKIE,
  REMEMBER_COOKIE,
  SESSION_STARTED_COOKIE,
} from "@/lib/auth-security";
import { issueSessionClockCookieValues } from "@/lib/auth-security-server";
import { sessionBindingFromAccessToken } from "@/lib/security/session-binding";
import { createServiceClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { clientIpFromHeaders } from "@/lib/security/client-ip";
import { redactForLogs } from "@/lib/security/redact";

/**
 * Best-effort: log a breadcrumb when this login joins other still-active
 * sessions. Never blocks or fails the login flow.
 */
async function recordConcurrentSessionIfAny(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string,
  request: NextRequest
) {
  if (!isServiceRoleConfigured()) return;
  try {
    const { data, error } = await supabase.rpc("list_own_active_sessions");
    if (error || !data) return;
    const otherSessions = data.filter((row) => !row.is_current);
    if (otherSessions.length === 0) return;

    const admin = createServiceClient();
    await admin.rpc("log_account_activity_server", {
      p_event_type: "concurrent_session_detected",
      p_user_id: userId,
      p_ip: clientIpFromHeaders(request.headers),
      p_user_agent: request.headers.get("user-agent"),
      p_meta: { count: otherSessions.length },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        type: "concurrent_session_detection_failed",
        message: redactForLogs(error instanceof Error ? error.message : "unknown"),
      })
    );
  }
}

/**
 * POST /auth/session/start — seed signed absolute + idle session clocks after login.
 */
export async function POST(request: NextRequest) {
  let remember = false;
  try {
    const body = (await request.json()) as { remember?: unknown };
    remember = Boolean(body?.remember);
  } catch {
    remember = request.cookies.get(REMEMBER_COOKIE)?.value === "1";
  }

  const response = NextResponse.json({ ok: true });
  const cookieOptions = getSupabaseCookieOptions(remember);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const binding = sessionBindingFromAccessToken({
    userId: user?.id ?? "",
    accessToken: session?.access_token,
  });
  if (!user || !binding) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const now = Date.now();
  const clocks = await issueSessionClockCookieValues({
    binding,
    remember,
    startedAtMs: now,
    lastActivityAtMs: now,
  });
  if (!clocks) {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  const clockOpts = getSessionClockCookieOptions(remember);
  const rememberOpts = getRememberCookieOptions(remember);
  response.cookies.set(REMEMBER_COOKIE, remember ? "1" : "0", rememberOpts);
  response.cookies.set(SESSION_STARTED_COOKIE, clocks.started, clockOpts);
  response.cookies.set(LAST_ACTIVITY_COOKIE, clocks.lastActivity, clockOpts);
  // Login, password/email/MFA changes rotate clocks and drop prior reauth grants.
  // A reauth cookie is issued only by POST /auth/reauth after step-up.
  response.cookies.set(REAUTH_COOKIE, "", { ...getReauthCookieOptions(), maxAge: 0 });

  await recordConcurrentSessionIfAny(supabase, user.id, request);

  return response;
}
