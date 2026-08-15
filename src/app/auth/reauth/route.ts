import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import {
  evaluateRecentReauth,
  GENERIC_LOGIN_ERROR,
  getReauthCookieOptions,
  getSupabaseCookieOptions,
  REAUTH_COOKIE,
  REAUTH_MAX_AGE_MS,
  REMEMBER_COOKIE,
  toGenericLoginError,
} from "@/lib/auth-security";
import { runSensitiveHttpAction } from "@/lib/security/rate-limit";

function createSupabase(request: NextRequest, response: NextResponse) {
  const remember = request.cookies.get(REMEMBER_COOKIE)?.value === "1";
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSupabaseCookieOptions(remember),
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
}

/**
 * GET /auth/reauth — whether step-up reauthentication is still valid.
 * When MFA is enrolled, a valid cookie alone is not enough unless the session is AAL2
 * (or the client will be asked for a TOTP code).
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.json({ ok: true, valid: false });
  const supabase = createSupabase(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, valid: false, error: "unauthenticated" }, { status: 401 });
  }

  let mfaEnabled = false;
  let aal2 = false;
  try {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    mfaEnabled = (factors?.totp ?? []).some((factor) => factor.status === "verified");
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    aal2 = aal?.currentLevel === "aal2";
  } catch {
    mfaEnabled = false;
    aal2 = false;
  }

  const check = evaluateRecentReauth({
    reauthRaw: request.cookies.get(REAUTH_COOKIE)?.value,
  });

  // Sensitive actions with MFA: need recent reauth AND AAL2.
  const valid = check.ok && (!mfaEnabled || aal2);

  if (!valid) {
    return NextResponse.json({
      ok: true,
      valid: false,
      mfaEnabled,
      aal2,
      reason: !check.ok ? check.reason : mfaEnabled && !aal2 ? "aal_required" : "unknown",
      maxAgeMs: REAUTH_MAX_AGE_MS,
    });
  }

  return NextResponse.json({
    ok: true,
    valid: true,
    mfaEnabled,
    aal2,
    reauthenticatedAt: check.reauthenticatedAt,
    expiresAt: check.expiresAt,
    maxAgeMs: REAUTH_MAX_AGE_MS,
  });
}

/**
 * POST /auth/reauth — confirm password and/or TOTP, then stamp reauthenticated_at.
 * Prefer TOTP when MFA is enrolled (password alone is not enough for those accounts).
 */
export async function POST(request: NextRequest) {
  let password = "";
  let code = "";
  try {
    const body = (await request.json()) as { password?: unknown; code?: unknown };
    password = typeof body?.password === "string" ? body.password : "";
    code = typeof body?.code === "string" ? body.code.replace(/\s/g, "") : "";
  } catch {
    password = "";
    code = "";
  }

  const cookieJar = NextResponse.next();
  const supabase = createSupabase(request, cookieJar);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  let mfaEnabled = false;
  let factorId: string | null = null;
  try {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verified = (factors?.totp ?? []).find((factor) => factor.status === "verified");
    mfaEnabled = Boolean(verified);
    factorId = verified?.id ?? null;
  } catch {
    mfaEnabled = false;
  }

  if (mfaEnabled && factorId) {
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { ok: false, error: "Enter the 6-digit code from your authenticator app.", mfaEnabled: true },
        { status: 400 }
      );
    }
    const gated = await runSensitiveHttpAction("authAbuse", user.id, async () => {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) {
        return { ok: false as const, status: 400, error: challengeError.message, mfaEnabled: true };
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) {
        return {
          ok: false as const,
          status: 401,
          error: verifyError.message || "Invalid authenticator code.",
          mfaEnabled: true,
        };
      }
      return { ok: true as const };
    });
    if (!gated.ok) return gated.response;
    if (!gated.value.ok) {
      return NextResponse.json(
        { ok: false, error: gated.value.error, mfaEnabled: true },
        { status: gated.value.status }
      );
    }
  } else {
    if (!password) {
      return NextResponse.json({ ok: false, error: "Password is required." }, { status: 400 });
    }
    const gated = await runSensitiveHttpAction("authAbuse", user.id, async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password,
      });
      return error;
    });
    if (!gated.ok) return gated.response;
    if (gated.value) {
      return NextResponse.json(
        { ok: false, error: toGenericLoginError(gated.value.message) || GENERIC_LOGIN_ERROR },
        { status: 401 }
      );
    }
  }

  const now = Date.now();
  const response = NextResponse.json({
    ok: true,
    valid: true,
    mfaEnabled,
    reauthenticatedAt: now,
    expiresAt: now + REAUTH_MAX_AGE_MS,
    maxAgeMs: REAUTH_MAX_AGE_MS,
  });

  cookieJar.cookies.getAll().forEach(({ name, value }) => {
    response.cookies.set(name, value);
  });
  response.cookies.set(REAUTH_COOKIE, String(now), getReauthCookieOptions());

  return response;
}
