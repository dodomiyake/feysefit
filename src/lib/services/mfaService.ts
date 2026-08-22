import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/design-tokens";
import { isRememberSessionEnabled, startAppSession, toGenericMfaError } from "@/lib/auth-security";

export type MfaAssurance = {
  currentLevel: "aal1" | "aal2" | null;
  nextLevel: "aal1" | "aal2" | null;
};

export type TotpEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
};

export type VerifiedTotpFactor = {
  id: string;
  friendlyName: string | null;
};

/** Role policy for MFA enrollment. */
export function mfaPolicyForRole(role: UserRole | null | undefined): {
  required: boolean;
  encouraged: boolean;
  optional: boolean;
} {
  if (role === "admin") return { required: true, encouraged: false, optional: false };
  if (role === "designer") return { required: false, encouraged: true, optional: false };
  return { required: false, encouraged: false, optional: true };
}

export async function getMfaAssuranceLevel(): Promise<MfaAssurance> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw new Error(error.message);
  return {
    currentLevel: (data.currentLevel as MfaAssurance["currentLevel"]) ?? null,
    nextLevel: (data.nextLevel as MfaAssurance["nextLevel"]) ?? null,
  };
}

export async function listVerifiedTotpFactors(): Promise<VerifiedTotpFactor[]> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(error.message);
  return (data.totp ?? [])
    .filter((factor) => factor.status === "verified")
    .map((factor) => ({
      id: factor.id,
      friendlyName: factor.friendly_name ?? null,
    }));
}

export async function hasVerifiedTotp(): Promise<boolean> {
  const factors = await listVerifiedTotpFactors();
  return factors.length > 0;
}

export async function getPrimaryTotpFactorId(): Promise<string | null> {
  const factors = await listVerifiedTotpFactors();
  return factors[0]?.id ?? null;
}

/** True when the user must complete a TOTP challenge to reach AAL2. */
export async function needsMfaChallenge(): Promise<boolean> {
  const aal = await getMfaAssuranceLevel();
  return aal.currentLevel !== "aal2" && aal.nextLevel === "aal2";
}

/** True when an admin (or other required role) has no MFA factor enrolled. */
export async function needsMfaEnrollment(role: UserRole | null | undefined): Promise<boolean> {
  const policy = mfaPolicyForRole(role);
  if (!policy.required) return false;
  return !(await hasVerifiedTotp());
}

export async function enrollTotp(friendlyName = "Authenticator app"): Promise<TotpEnrollment> {
  const supabase = createClient();

  // Clean up abandoned unverified TOTP factors so enroll does not fail.
  const { data: existing } = await supabase.auth.mfa.listFactors();
  for (const factor of existing?.all ?? []) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });
  if (error) throw new Error(toGenericMfaError(error.message));
  if (!data.totp?.qr_code || !data.totp.secret) {
    throw new Error("Could not start authenticator setup. Try again.");
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

export async function verifyTotpCode(factorId: string, code: string): Promise<void> {
  const trimmed = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(trimmed)) {
    throw new Error("Enter the 6-digit code from your authenticator app.");
  }

  const supabase = createClient();
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError) throw new Error(toGenericMfaError(challengeError.message));

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: trimmed,
  });
  if (verifyError) throw new Error(toGenericMfaError(verifyError.message));
  await startAppSession(isRememberSessionEnabled());
}

export async function unenrollTotpFactor(factorId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new Error(toGenericMfaError(error.message));
  await startAppSession(isRememberSessionEnabled());
}

/**
 * After password login: where to send the user before their destination.
 * Returns null when they may proceed to `nextPath`.
 */
export async function resolvePostLoginMfaPath(
  role: UserRole,
  nextPath: string
): Promise<string | null> {
  if (await needsMfaEnrollment(role)) {
    const params = new URLSearchParams({ next: nextPath, required: "1" });
    return `/auth/mfa/setup?${params.toString()}`;
  }
  if (await needsMfaChallenge()) {
    const params = new URLSearchParams({ next: nextPath });
    return `/auth/mfa?${params.toString()}`;
  }
  return null;
}
