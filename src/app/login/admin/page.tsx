"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoginCredentialsForm } from "@/components/auth/LoginCredentialsForm";
import { LoginPageShell, LoginPortalLink } from "@/components/auth/LoginPageShell";
import { CaptchaSlot } from "@/components/auth/CaptchaSlot";
import { useApp } from "@/context/AppContext";
import { isApiEnabled, isDemoAuthAllowed, isSupabaseEnabled } from "@/lib/config/backend";
import { DEMO_CREDENTIALS } from "@/lib/demo-auth";
import { resolvePostLoginMfaPath } from "@/lib/services/mfaService";
import { useAuthAbuseGuard } from "@/hooks/useAuthAbuseGuard";
import { logSecurityEvent } from "@/lib/security-events";
import { logAccountActivity } from "@/lib/account-activity";

export default function AdminLoginPage() {
  const router = useRouter();
  const { setRole, login, showToast } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const useSupabase = isSupabaseEnabled();
  const useRemote = useSupabase || isApiEnabled();
  const allowDemoAuth = isDemoAuthAllowed();
  const abuse = useAuthAbuseGuard("login", email);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const blocked = abuse.precheck();
    if (blocked) {
      showToast(blocked, "error");
      logSecurityEvent({
        eventType: abuse.snapshot.limited ? "login_cooldown" : "captcha_required",
        email,
        meta: { portal: "admin" },
      });
      return;
    }
    setSubmitting(true);
    try {
      if (useRemote) {
        const user = await login(email, password, {
          rememberMe,
          captchaToken: abuse.captchaToken,
        });
        abuse.onSuccess();
        logSecurityEvent({ eventType: "login_succeeded", email, meta: { portal: "admin" } });
        logAccountActivity({ eventType: "login_succeeded", email, meta: { portal: "admin" } });
        if (user.role !== "admin") {
          showToast(
            "This portal is for platform admins only. Use the main sign-in for designers and clients.",
            "error"
          );
          return;
        }
        if (useSupabase) {
          const mfaPath = await resolvePostLoginMfaPath("admin", "/dashboard/admin");
          if (mfaPath) {
            router.push(mfaPath);
            return;
          }
        }
        showToast("Welcome back!");
        router.push("/dashboard/admin");
        return;
      }

      setRole("admin");
      showToast("Welcome back!");
      router.push("/dashboard/admin");
    } catch (error) {
      const next = abuse.onFailure();
      logSecurityEvent({
        eventType: next.limited ? "login_cooldown" : "login_failed",
        email,
        meta: { portal: "admin", failures: next.failures },
      });
      if (!next.limited) {
        logAccountActivity({
          eventType: "login_failed",
          email,
          meta: { portal: "admin", failures: next.failures },
        });
      }
      showToast(error instanceof Error ? error.message : "Login failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const demoAdminLogin = async () => {
    setSubmitting(true);
    try {
      if (useRemote) {
        const user = await login(DEMO_CREDENTIALS.admin.email, DEMO_CREDENTIALS.admin.password);
        if (user.role !== "admin") {
          showToast("Demo admin account is not configured.", "error");
          return;
        }
        if (useSupabase) {
          const mfaPath = await resolvePostLoginMfaPath("admin", "/dashboard/admin");
          if (mfaPath) {
            router.push(mfaPath);
            return;
          }
        }
        showToast("Continuing as admin");
        router.push("/dashboard/admin");
        return;
      }

      setRole("admin");
      showToast("Continuing as admin");
      router.push("/dashboard/admin");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Login failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LoginPageShell
      mobileTitle="Admin Sign In"
      backHref="/login"
      backLabel="Back to sign in"
      eyebrow="Platform Operations"
      title="Admin Portal"
      footer={
        <>
          <LoginPortalLink href="/login">Designer or customer? Sign in here</LoginPortalLink>
          {allowDemoAuth && !useRemote && (
            <Card className="border-[#d3c3ba]/30 bg-card/80" padding="md">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted/70">
                Demo — Admin Access
              </p>
              <div className="mt-3">
                <Button
                  variant="secondary"
                  className="w-full text-sm"
                  disabled={submitting}
                  onClick={() => void demoAdminLogin()}
                >
                  Continue as Admin
                </Button>
              </div>
            </Card>
          )}
        </>
      }
    >
      <p className="mt-4 text-center text-sm leading-relaxed text-zinc-500">
        Restricted access for FeyseFit platform administrators.
      </p>

      <LoginCredentialsForm
        email={email}
        password={password}
        showPassword={showPassword}
        rememberMe={rememberMe}
        submitting={submitting}
        emailPlaceholder="admin@feysefit.com"
        submitLabel="Sign in"
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onShowPasswordToggle={() => setShowPassword((v) => !v)}
        onRememberMeChange={setRememberMe}
        onSubmit={handleLogin}
        disabled={abuse.snapshot.limited}
        notice={
          abuse.snapshot.message ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {abuse.snapshot.message}
            </p>
          ) : null
        }
        beforeSubmit={<CaptchaSlot hostRef={abuse.captchaHostRef} show={abuse.showCaptcha} />}
      />
    </LoginPageShell>
  );
}
