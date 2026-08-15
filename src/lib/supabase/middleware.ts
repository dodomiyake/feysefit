import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import type { UserRole } from "@/lib/design-tokens";
import {
  dashboardForRole,
  getAuthRequirement,
  isRoleAllowed,
  loginPathForRequirement,
} from "@/lib/auth-routes";
import { normalizeOnboardingPath, normalizeOnboardingStatus, postAuthDestination } from "@/lib/onboarding";
import {
  evaluateSessionClocks,
  getRememberCookieOptions,
  getSessionClockCookieOptions,
  getSupabaseCookieOptions,
  LAST_ACTIVITY_COOKIE,
  REAUTH_COOKIE,
  REMEMBER_COOKIE,
  SESSION_STARTED_COOKIE,
  isSupabaseAuthCookie,
} from "@/lib/auth-security";

const AUTH_REFRESH_TIMEOUT_MS = 4_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  // If we time out, the original fetch may still reject later. Attach a no-op
  // catch so that rejection cannot crash the Next.js request (Failed to fetch).
  void promise.catch(() => undefined);
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Auth refresh timed out")), ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function applyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value, ...options }) => {
    to.cookies.set(name, value, options);
  });
}

function redirectWithCookies(request: NextRequest, from: NextResponse, target: string) {
  const url = request.nextUrl.clone();
  const queryIndex = target.indexOf("?");
  if (queryIndex === -1) {
    url.pathname = target;
    url.search = "";
  } else {
    url.pathname = target.slice(0, queryIndex);
    url.search = target.slice(queryIndex);
  }
  const redirect = NextResponse.redirect(url);
  applyCookies(from, redirect);
  return redirect;
}

/**
 * Initialize absolute/idle clocks when missing.
 * Do NOT refresh last-activity here — that would defeat server-side idle
 * enforcement (background polls / navigation would keep the session alive).
 * Intentional activity updates LAST_ACTIVITY via POST /auth/activity (httpOnly).
 */
function stampSessionCookies(
  response: NextResponse,
  remember: boolean,
  options: { startedAt: number; lastActivityAt: number }
) {
  const clockOpts = getSessionClockCookieOptions(remember);
  response.cookies.set(REMEMBER_COOKIE, remember ? "1" : "0", getRememberCookieOptions(remember));
  response.cookies.set(SESSION_STARTED_COOKIE, String(options.startedAt), clockOpts);
  response.cookies.set(LAST_ACTIVITY_COOKIE, String(options.lastActivityAt), clockOpts);
}

function clearSessionClockCookies(response: NextResponse) {
  const base = {
    path: "/",
    maxAge: 0,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
  response.cookies.set(REMEMBER_COOKIE, "", base);
  response.cookies.set(SESSION_STARTED_COOKIE, "", { ...base, httpOnly: true });
  response.cookies.set(LAST_ACTIVITY_COOKIE, "", { ...base, httpOnly: true });
  response.cookies.set(REAUTH_COOKIE, "", { ...base, httpOnly: true });
}

type UserProfile = {
  role: UserRole;
  account_status: "active" | "suspended" | "banned";
  onboarding_status: string;
  onboarding_path: string;
  onboarding_step: string;
};

async function loadUserProfile(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string
): Promise<UserProfile | null> {
  const { data: profile, error } = await supabase
    .from("users")
    .select("role, account_status, onboarding_status, onboarding_path, onboarding_step")
    .eq("id", userId)
    .maybeSingle();

  if (!error && profile) {
    return {
      role: profile.role as UserRole,
      account_status: profile.account_status ?? "active",
      onboarding_status: profile.onboarding_status ?? "completed",
      onboarding_path: profile.onboarding_path ?? "",
      onboarding_step: profile.onboarding_step ?? "",
    };
  }

  // Fallback when onboarding columns are not migrated yet.
  const { data: legacy } = await supabase
    .from("users")
    .select("role, account_status")
    .eq("id", userId)
    .maybeSingle();
  if (!legacy) return null;
  return {
    role: legacy.role as UserRole,
    account_status: legacy.account_status ?? "active",
    onboarding_status: "completed",
    onboarding_path: "",
    onboarding_step: "",
  };
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requirement = getAuthRequirement(pathname);
  const isAdminRoute = pathname.startsWith("/dashboard/admin");
  const requiresAuth = requirement.type !== "public";
  const isVerifyEmailRoute = pathname.startsWith("/verify-email");

  if (!requiresAuth && !isVerifyEmailRoute) {
    return NextResponse.next({ request });
  }

  const hasSessionCookie = request.cookies.getAll().some((cookie) => isSupabaseAuthCookie(cookie.name));
  if (!hasSessionCookie) {
    if (!requiresAuth) return NextResponse.next({ request });
    return redirectWithCookies(
      request,
      NextResponse.next({ request }),
      loginPathForRequirement(pathname, requirement)
    );
  }

  const rememberPreferred = request.cookies.get(REMEMBER_COOKIE)?.value === "1";
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSupabaseCookieOptions(rememberPreferred),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...getSupabaseCookieOptions(rememberPreferred),
              ...options,
              maxAge: getSupabaseCookieOptions(rememberPreferred).maxAge,
            })
          );
        },
      },
    }
  );

  try {
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), AUTH_REFRESH_TIMEOUT_MS);

    if (!user) {
      if (!requiresAuth) return supabaseResponse;
      return redirectWithCookies(
        request,
        supabaseResponse,
        loginPathForRequirement(pathname, requirement)
      );
    }

    // Email verification gate (server-side)
    const emailConfirmed = Boolean(user.email_confirmed_at);
    if (!emailConfirmed && !isVerifyEmailRoute) {
      const email = encodeURIComponent(user.email ?? "");
      return redirectWithCookies(
        request,
        supabaseResponse,
        `/verify-email${email ? `?email=${email}` : ""}`
      );
    }
    if (emailConfirmed && isVerifyEmailRoute) {
      const profile = await loadUserProfile(supabase, user.id);
      return redirectWithCookies(
        request,
        supabaseResponse,
        profile
          ? postAuthDestination({
              role: profile.role,
              onboardingStatus: normalizeOnboardingStatus(profile.onboarding_status),
              onboardingPath: normalizeOnboardingPath(profile.onboarding_path),
              onboardingStep: profile.onboarding_step,
            })
          : "/login"
      );
    }

    if (!requiresAuth) {
      return supabaseResponse;
    }

    const clock = evaluateSessionClocks({
      rememberRaw: request.cookies.get(REMEMBER_COOKIE)?.value,
      startedRaw: request.cookies.get(SESSION_STARTED_COOKIE)?.value,
      lastActivityRaw: request.cookies.get(LAST_ACTIVITY_COOKIE)?.value,
    });

    if (!clock.ok) {
      await supabase.auth.signOut();
      clearSessionClockCookies(supabaseResponse);
      const reason = clock.reason === "idle" ? "idle" : "expired";
      return redirectWithCookies(
        request,
        supabaseResponse,
        `/login?error=${reason}&next=${encodeURIComponent(pathname)}`
      );
    }

    const startedRaw = request.cookies.get(SESSION_STARTED_COOKIE)?.value;
    const lastActivityRaw = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value;
    const startedAt = Number(startedRaw);
    const lastActivityAt = Number(lastActivityRaw);
    const clocksMissing = !Number.isFinite(startedAt) || !Number.isFinite(lastActivityAt);

    // Only seed clocks once; idle/absolute enforcement reads the cookies as-is after that.
    if (clocksMissing) {
      const now = Date.now();
      stampSessionCookies(supabaseResponse, clock.remember, {
        startedAt: now,
        lastActivityAt: now,
      });
    }

    const profile = await loadUserProfile(supabase, user.id);

    if (!profile) {
      return redirectWithCookies(
        request,
        supabaseResponse,
        loginPathForRequirement(pathname, requirement)
      );
    }

    if (profile.account_status === "suspended" || profile.account_status === "banned") {
      await supabase.auth.signOut();
      clearSessionClockCookies(supabaseResponse);
      return redirectWithCookies(request, supabaseResponse, "/login?error=account_disabled");
    }

    if (!isRoleAllowed(requirement, profile.role)) {
      if (pathname === "/measurements" && profile.role === "designer") {
        return redirectWithCookies(request, supabaseResponse, "/clients/measurements");
      }
      return redirectWithCookies(request, supabaseResponse, dashboardForRole(profile.role));
    }

    // Incomplete onboarding: keep users on setup until finished.
    const onboardingIncomplete =
      profile.role !== "admin" &&
      normalizeOnboardingStatus(profile.onboarding_status) !== "completed";
    const isOnboardingRoute = pathname.startsWith("/onboarding/");
    const isAuthUtilityRoute =
      pathname.startsWith("/auth/") ||
      pathname.startsWith("/verify-email") ||
      pathname.startsWith("/terms") ||
      pathname.startsWith("/privacy");
    if (onboardingIncomplete && !isOnboardingRoute && !isAuthUtilityRoute) {
      return redirectWithCookies(
        request,
        supabaseResponse,
        postAuthDestination({
          role: profile.role,
          onboardingStatus: normalizeOnboardingStatus(profile.onboarding_status),
          onboardingPath: normalizeOnboardingPath(profile.onboarding_path),
          onboardingStep: profile.onboarding_step,
        })
      );
    }

    // MFA / AAL gates (skip while completing MFA setup or challenge)
    const isMfaRoute = pathname.startsWith("/auth/mfa");
    if (!isMfaRoute) {
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal) {
          const nextUrl = `${pathname}${request.nextUrl.search}`;
          // Admins must enroll TOTP before using the rest of the app.
          if (profile.role === "admin" && aal.nextLevel === "aal1") {
            return redirectWithCookies(
              request,
              supabaseResponse,
              `/auth/mfa/setup?required=1&next=${encodeURIComponent(nextUrl)}`
            );
          }
          // Enrolled users must complete a TOTP challenge (AAL2) for this session.
          if (aal.currentLevel !== "aal2" && aal.nextLevel === "aal2") {
            return redirectWithCookies(
              request,
              supabaseResponse,
              `/auth/mfa?next=${encodeURIComponent(nextUrl)}`
            );
          }
        }
      } catch {
        // Do not block the request if MFA APIs are unavailable (e.g. MFA not enabled in project).
      }
    }

    return supabaseResponse;
  } catch {
    if (isAdminRoute || requiresAuth) {
      return redirectWithCookies(
        request,
        supabaseResponse,
        loginPathForRequirement(pathname, requirement)
      );
    }
    return NextResponse.next({ request });
  }

  return supabaseResponse;
}
