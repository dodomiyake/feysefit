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

/**
 * POST /auth/session/start — seed absolute + idle session clocks after login.
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

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const now = String(Date.now());
  const clockOpts = getSessionClockCookieOptions(remember);
  const rememberOpts = getRememberCookieOptions(remember);
  response.cookies.set(REMEMBER_COOKIE, remember ? "1" : "0", rememberOpts);
  response.cookies.set(SESSION_STARTED_COOKIE, now, clockOpts);
  response.cookies.set(LAST_ACTIVITY_COOKIE, now, clockOpts);
  // Fresh login counts as recent reauthentication for sensitive actions.
  response.cookies.set(REAUTH_COOKIE, now, getReauthCookieOptions());

  return response;
}
