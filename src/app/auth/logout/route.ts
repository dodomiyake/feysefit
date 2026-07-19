import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import {
  clearSupabaseAuthCookies,
  getSupabaseCookieOptions,
  isSupabaseAuthCookie,
  REMEMBER_COOKIE,
} from "@/lib/auth-security";

type LogoutScope = "local" | "global";

/**
 * POST /auth/logout — ends the Supabase session and clears auth cookies server-side.
 * Body (optional): { scope?: "local" | "global" } — defaults to global.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const remember = request.cookies.get(REMEMBER_COOKIE)?.value === "1";
  const cookieOptions = getSupabaseCookieOptions(remember);

  let scope: LogoutScope = "global";
  try {
    const body = (await request.json()) as { scope?: unknown };
    if (body.scope === "local" || body.scope === "global") {
      scope = body.scope;
    }
  } catch {
    // Empty body → global (legacy callers).
  }

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

  try {
    await supabase.auth.signOut({ scope });
  } catch {
    // Still clear cookies below even if network sign-out fails.
  }

  const authCookieNames = request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter((name) => isSupabaseAuthCookie(name));

  clearSupabaseAuthCookies(authCookieNames, (name, value, options) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
