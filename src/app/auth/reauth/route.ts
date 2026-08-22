import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import {
  GENERIC_LOGIN_ERROR,
  GENERIC_MFA_ERROR,
  getReauthCookieOptions,
  getSupabaseCookieOptions,
  REAUTH_COOKIE,
  REAUTH_MAX_AGE_MS,
  REMEMBER_COOKIE,
  toGenericLoginError,
  toGenericMfaError,
} from "@/lib/auth-security";
import {
  evaluateRecentReauth,
  issueReauthCookieValue,
} from "@/lib/auth-security-server";
import { runSensitiveHttpAction } from "@/lib/security/rate-limit";
import { sessionBindingFromAccessToken } from "@/lib/security/session-binding";
import { redactForLogs } from "@/lib/security/redact";

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

async function bindingFor(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return sessionBindingFromAccessToken({
    userId,
    accessToken: session?.access_token,
  });
}

/**
 * GET /auth/reauth — whether step-up reauthentication is still valid.
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

  const binding = await bindingFor(supabase, user.id);
  if (!binding) {
    return NextResponse.json({ ok: true, valid: false, reason: "invalid", maxAgeMs: REAUTH_MAX_AGE_MS });
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

  const check = await evaluateRecentReauth({
    reauthRaw: request.cookies.get(REAUTH_COOKIE)?.value,
    binding,
  });

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
 * POST /auth/reauth — confirm password and/or TOTP, then stamp a signed grant.
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

  const binding = await bindingFor(supabase, user.id);
  if (!binding) {
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
        { ok: false, error: GENERIC_MFA_ERROR, mfaEnabled: true },
        { status: 400 }
      );
    }
    const gated = await runSensitiveHttpAction("authAbuse", user.id, async () => {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) {
        console.error(
          JSON.stringify({
            type: "mfa_challenge_failed",
            requestId: crypto.randomUUID(),
            message: redactForLogs(challengeError.message),
          })
        );
        return { ok: false as const, status: 400, error: GENERIC_MFA_ERROR, mfaEnabled: true };
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) {
        console.error(
          JSON.stringify({
            type: "mfa_verify_failed",
            requestId: crypto.randomUUID(),
            message: redactForLogs(verifyError.message),
          })
        );
        return {
          ok: false as const,
          status: 401,
          error: toGenericMfaError(verifyError.message),
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
      console.error(
        JSON.stringify({
          type: "reauth_password_failed",
          requestId: crypto.randomUUID(),
          message: redactForLogs(gated.value.message),
        })
      );
      return NextResponse.json(
        { ok: false, error: toGenericLoginError(gated.value.message) || GENERIC_LOGIN_ERROR },
        { status: 401 }
      );
    }
  }

  const now = Date.now();
  const token = await issueReauthCookieValue({ binding, nowMs: now });
  if (!token) {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

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
  response.cookies.set(REAUTH_COOKIE, token, getReauthCookieOptions());

  return response;
}
