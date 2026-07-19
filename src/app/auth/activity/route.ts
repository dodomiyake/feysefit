import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import {
  evaluateSessionClocks,
  getRememberCookieOptions,
  getSessionClockCookieOptions,
  getSupabaseCookieOptions,
  LAST_ACTIVITY_COOKIE,
  REMEMBER_COOKIE,
  SESSION_STARTED_COOKIE,
} from "@/lib/auth-security";

/**
 * POST /auth/activity — refresh idle clock after intentional user activity.
 * Enforces idle/absolute expiry server-side before accepting a touch.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const remember = request.cookies.get(REMEMBER_COOKIE)?.value === "1";
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

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const clock = evaluateSessionClocks({
    rememberRaw: request.cookies.get(REMEMBER_COOKIE)?.value,
    startedRaw: request.cookies.get(SESSION_STARTED_COOKIE)?.value,
    lastActivityRaw: request.cookies.get(LAST_ACTIVITY_COOKIE)?.value,
  });

  if (!clock.ok) {
    const denied = NextResponse.json(
      { ok: false, error: clock.reason },
      { status: 401 }
    );
    const clear = { path: "/", maxAge: 0, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" };
    denied.cookies.set(REMEMBER_COOKIE, "", clear);
    denied.cookies.set(SESSION_STARTED_COOKIE, "", { ...clear, httpOnly: true });
    denied.cookies.set(LAST_ACTIVITY_COOKIE, "", { ...clear, httpOnly: true });
    return denied;
  }

  const now = String(Date.now());
  const clockOpts = getSessionClockCookieOptions(clock.remember);
  const rememberOpts = getRememberCookieOptions(clock.remember);
  response.cookies.set(REMEMBER_COOKIE, clock.remember ? "1" : "0", rememberOpts);
  if (!request.cookies.get(SESSION_STARTED_COOKIE)?.value) {
    response.cookies.set(SESSION_STARTED_COOKIE, now, clockOpts);
  }
  response.cookies.set(LAST_ACTIVITY_COOKIE, now, clockOpts);

  return response;
}
