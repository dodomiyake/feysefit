import { createClient } from "@/lib/supabase/client";
import { resolveAppOrigin } from "@/lib/email/invite-email";
import type { AppAuthUser } from "@/lib/types/database";
import type { UserRole } from "@/lib/design-tokens";
import {
  GENERIC_LOGIN_ERROR,
  isPasswordStrongEnough,
  isRememberSessionEnabled,
  startAppSession,
  toGenericLoginError,
} from "@/lib/auth-security";
import { requireCaptchaToken } from "@/lib/security/captcha-policy";

function formatTimestamp() {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export type SignUpResult =
  | { needsEmailConfirmation: true; email: string }
  | { needsEmailConfirmation: false; user: AppAuthUser };

export async function signIn(
  email: string,
  password: string,
  options?: { captchaToken?: string | null }
) {
  const captchaBlock = requireCaptchaToken(options?.captchaToken);
  if (captchaBlock) throw new Error(captchaBlock);

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
    options: options?.captchaToken
      ? { captchaToken: options.captchaToken }
      : undefined,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
      throw new Error(GENERIC_LOGIN_ERROR);
    }
    if (msg.includes("captcha") || msg.includes("timeout-or-duplicate")) {
      console.error("signIn captcha rejected:", error.message);
      throw new Error(
        "Security check expired or already used. Wait for a fresh Success check, then try signing in once."
      );
    }
    throw new Error(toGenericLoginError(error.message) || GENERIC_LOGIN_ERROR);
  }

  if (data.user && !data.user.email_confirmed_at) {
    await supabase.auth.signOut({ scope: "local" });
    throw new Error(GENERIC_LOGIN_ERROR);
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new Error(
      "Signed in but profile is missing. Run supabase/update-auth-trigger.sql in the SQL editor."
    );
  }

  if (user.accountStatus === "suspended") {
    await signOut();
    throw new Error("Your account has been suspended. Contact FeyseFit support.");
  }
  if (user.accountStatus === "banned") {
    await signOut();
    throw new Error("Your account has been banned.");
  }

  if (user.role === "customer") {
    try {
      const { syncPendingInviteFromAuthMetadata } = await import("@/lib/services/inviteService");
      await syncPendingInviteFromAuthMetadata();
    } catch {
      // Invite may already be accepted; login should still succeed.
    }
  }

  return { ...user, emailConfirmed: true as const };
}

export async function signUp(input: {
  email: string;
  password: string;
  name: string;
  role: "designer" | "customer";
  customerPath?: "direct" | "invite";
  inviteCode?: string;
  captchaToken?: string | null;
}): Promise<SignUpResult> {
  if (input.role !== "designer" && input.role !== "customer") {
    throw new Error("Invalid account type.");
  }
  if (!isPasswordStrongEnough(input.password)) {
    throw new Error("Password must be at least 12 characters.");
  }

  // Turnstile tokens are single-use. Never call Supabase signup without a fresh solved token
  // when CAPTCHA is configured — otherwise accounts can be created while the UI still looks blocked.
  const captchaToken = input.captchaToken?.trim() || "";
  const captchaBlock = requireCaptchaToken(captchaToken);
  if (captchaBlock) throw new Error(captchaBlock);

  const supabase = createClient();
  const origin =
    typeof window !== "undefined" ? window.location.origin : resolveAppOrigin();
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/verify-email")}`;

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      emailRedirectTo,
      ...(captchaToken ? { captchaToken } : {}),
      data: {
        name: input.name.trim(),
        role: input.role,
        customer_path: input.customerPath,
        invite_code: input.inviteCode,
      },
    },
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("captcha") || msg.includes("timeout-or-duplicate")) {
      console.error("signUp captcha rejected:", error.message);
      throw new Error(
        "Security check expired or already used. Wait for a fresh Success check, then click Create Account once."
      );
    }
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      throw new Error(
        "An account with this email already exists. Sign in instead, or use a different email."
      );
    }
    throw new Error(toGenericLoginError(error.message));
  }
  if (!data.user) throw new Error("Signup failed");

  // Prefer explicit verification flow whenever email is not confirmed yet.
  if (!data.session || !data.user.email_confirmed_at) {
    return {
      needsEmailConfirmation: true,
      email: input.email.trim().toLowerCase(),
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 400));

  let user = await getCurrentUser();
  if (!user) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    user = await getCurrentUser();
  }
  if (!user) {
    throw new Error(
      "Account created but profile setup failed. Run supabase/update-auth-trigger.sql, then try signing in."
    );
  }

  if (input.role === "customer" && input.inviteCode) {
    const { acceptInviteCode } = await import("@/lib/services/inviteService");
    await acceptInviteCode(input.inviteCode);
  }

  return { needsEmailConfirmation: false, user };
}

export async function resendSignupConfirmation(
  email: string,
  options?: { captchaToken?: string | null }
) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error("Email is required.");
  const captchaBlock = requireCaptchaToken(options?.captchaToken);
  if (captchaBlock) throw new Error(captchaBlock);

  const supabase = createClient();
  const origin =
    typeof window !== "undefined" ? window.location.origin : resolveAppOrigin();
  const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalized,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/verify-email")}`,
        captchaToken: options?.captchaToken?.trim() || undefined,
      },
    });
  // Always present a generic outcome to callers (anti-enumeration).
  if (error) {
    console.error("resendSignupConfirmation:", error.message);
  }
}

export async function resetPasswordForEmail(
  email: string,
  options?: { captchaToken?: string | null }
) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error("Email is required.");
  const captchaBlock = requireCaptchaToken(options?.captchaToken);
  if (captchaBlock) throw new Error(captchaBlock);

  const supabase = createClient();
  const origin =
    typeof window !== "undefined" ? window.location.origin : resolveAppOrigin();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`;

  const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
    redirectTo,
    captchaToken: options?.captchaToken?.trim() || undefined,
  });
  // Always present a generic outcome to the UI caller.
  if (error) {
    console.error("resetPasswordForEmail:", error.message);
  }
}

export async function signOut() {
  const supabase = createClient();
  try {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) throw new Error(error.message);
  } finally {
    try {
      await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // Network errors still leave client state cleared by the caller.
    }
  }
}

export async function getCurrentUser(): Promise<
  (AppAuthUser & { emailConfirmed: boolean }) | null
> {
  const supabase = createClient();
  let user;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    return null;
  }
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !profile) return null;

  const accountStatus = profile.account_status ?? "active";
  if (accountStatus === "suspended" || accountStatus === "banned") {
    await signOut();
    return null;
  }

  const role = profile.role as UserRole;
  let designerProfileId: string | undefined;
  let designerLegacyId: string | undefined;
  let customerProfileId: string | undefined;
  let customerLegacyId: string | undefined;

  if (role === "designer") {
    const { data: ownDesigner, error: ownDesignerError } = await supabase.rpc("own_designer_profile");
    const designer = ownDesignerError ? null : ownDesigner?.[0];
    if (designer) {
      designerProfileId = designer.id;
      designerLegacyId = designer.legacy_id ?? designer.id;
    } else {
      const { data: legacyDesigner } = await supabase
        .from("designer_profiles")
        .select("id, legacy_id")
        .eq("user_id", user.id)
        .maybeSingle();
      designerProfileId = legacyDesigner?.id;
      designerLegacyId = legacyDesigner?.legacy_id ?? legacyDesigner?.id;
    }
  }

  if (role === "customer") {
    const { data: customer } = await supabase
      .from("customer_profiles")
      .select("id, legacy_id")
      .eq("user_id", user.id)
      .maybeSingle();
    customerProfileId = customer?.id;
    customerLegacyId = customer?.legacy_id ?? customer?.id;
  }

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role,
    accountStatus: profile.account_status ?? "active",
    profileImage: profile.profile_image?.trim() || undefined,
    designerProfileId,
    designerLegacyId,
    customerProfileId,
    customerLegacyId,
    emailConfirmed: Boolean(user.email_confirmed_at),
  };
}

export async function updateUserProfile(
  userId: string,
  patch: {
    name?: string;
    profileImage?: string;
  }
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .update({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.profileImage !== undefined ? { profile_image: patch.profileImage } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const role = data.role as UserRole;
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role,
    profileImage: data.profile_image?.trim() || undefined,
  } satisfies Pick<AppAuthUser, "id" | "email" | "name" | "role" | "profileImage">;
}

export async function updatePassword(newPassword: string) {
  if (!isPasswordStrongEnough(newPassword)) {
    throw new Error("Password must be at least 12 characters.");
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(toGenericLoginError(error.message));

  try {
    await supabase.rpc("mark_password_changed");
  } catch {
    // Patch may not be applied yet — password still updated in Auth.
  }

  // Invalidate other devices / sessions after password change.
  await supabase.auth.signOut({ scope: "others" });
  await startAppSession(isRememberSessionEnabled());
}

/** End every refresh session except the current browser. */
export async function signOutOtherSessions() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) throw new Error(error.message);
}

/** Sign out only this browser (leave other devices signed in). */
export async function signOutThisDevice() {
  const supabase = createClient();
  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw new Error(error.message);
  } finally {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "local" }),
      });
    } catch {
      // Caller still clears local app state.
    }
  }
}

/** Revoke every session including this device. */
export async function signOutAllDevices() {
  const supabase = createClient();
  try {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) throw new Error(error.message);
  } finally {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "global" }),
      });
    } catch {
      // Caller still clears local app state.
    }
  }
}

export { formatTimestamp };
