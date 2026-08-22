"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoginCredentialsForm } from "@/components/auth/LoginCredentialsForm";
import { LoginPageShell, LoginPortalLink } from "@/components/auth/LoginPageShell";
import { CaptchaSlot } from "@/components/auth/CaptchaSlot";
import { useApp } from "@/context/AppContext";
import { resolveSafeNextPath } from "@/lib/auth-routes";
import { postAuthDestination } from "@/lib/onboarding";
import { getUserOnboardingState } from "@/lib/services/onboardingService";
import { isApiEnabled, isDemoAuthAllowed, isSupabaseEnabled } from "@/lib/config/backend";
import { DEMO_CREDENTIALS } from "@/lib/demo-auth";
import { resolvePostLoginMfaPath } from "@/lib/services/mfaService";
import { useAuthAbuseGuard } from "@/hooks/useAuthAbuseGuard";
import { logSecurityEvent } from "@/lib/security-events";
import { logAccountActivity } from "@/lib/account-activity";
import { cn } from "@/lib/cn";

const MEMBER_ROLES = [
  { value: "designer" as const, label: "Designer" },
  { value: "customer" as const, label: "Client" },
];

const EMAIL_PLACEHOLDERS = {
  designer: "you@atelier.com",
  customer: "client@luxury.me",
};

const DASHBOARD_ROUTES = {
  designer: "/dashboard/designer",
  customer: "/dashboard/customer",
};

async function resolveMemberDestination(
  role: "designer" | "customer",
  preferredNext: string | null,
  useSupabase: boolean,
  userId?: string
) {
  if (!useSupabase || !userId) {
    return preferredNext ?? DASHBOARD_ROUTES[role];
  }
  try {
    const onboarding = await getUserOnboardingState(userId);
    return postAuthDestination({
      role,
      onboardingStatus: onboarding.status,
      onboardingPath: onboarding.path,
      onboardingStep: onboarding.step,
      preferredNext,
    });
  } catch {
    return preferredNext ?? DASHBOARD_ROUTES[role];
  }
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setRole, login, showToast, initDemoCustomer, initDirectCustomer, syncProjects } = useApp();
  const roleParam = searchParams.get("role");
  const [loginRole, setLoginRole] = useState<"designer" | "customer">(
    roleParam === "customer" ? "customer" : "designer"
  );
  if (roleParam === "customer" || roleParam === "designer") {
    if (loginRole !== roleParam) setLoginRole(roleParam);
  }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const useSupabase = isSupabaseEnabled();
  const useRemote = useSupabase || isApiEnabled();
  const allowDemoAuth = isDemoAuthAllowed();
  const nextPath = resolveSafeNextPath(searchParams.get("next"));
  const abuse = useAuthAbuseGuard("login", email);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "account_disabled") {
      showToast("This account has been suspended or banned.", "error");
    } else if (error === "auth_callback") {
      showToast("Sign-in link expired or invalid. Try again.", "error");
    } else if (error === "idle") {
      showToast("You were signed out after a period of inactivity.", "error");
    } else if (error === "expired") {
      showToast("Your session expired. Please sign in again.", "error");
    }
  }, [searchParams, showToast]);

  const postLoginHref = async (role: "designer" | "customer", userId?: string) => {
    return resolveMemberDestination(role, nextPath, useSupabase, userId);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const blocked = abuse.precheck();
    if (blocked) {
      showToast(blocked, "error");
      if (abuse.snapshot.limited) {
        logSecurityEvent({ eventType: "login_cooldown", email, meta: { portal: "member" } });
      } else if (abuse.snapshot.requiresCaptcha) {
        logSecurityEvent({ eventType: "captcha_required", email, meta: { portal: "member" } });
      }
      return;
    }
    setSubmitting(true);
    try {
      if (useRemote) {
        const captchaToken = abuse.showCaptcha ? abuse.consumeCaptchaToken() : abuse.captchaToken;
        if (abuse.showCaptcha && !captchaToken) {
          showToast("Complete the security check first.", "error");
          return;
        }
        const user = await login(email, password, {
          rememberMe,
          captchaToken,
        });
        abuse.onSuccess();
        logSecurityEvent({ eventType: "login_succeeded", email, meta: { portal: "member" } });
        logAccountActivity({ eventType: "login_succeeded", email, meta: { portal: "member" } });
        if (user.role === "admin") {
          showToast("Admins must use the admin portal at /login/admin", "error");
          return;
        }
        if (user.role !== loginRole) {
          showToast(`This account is registered as a ${user.role}. Switch to the ${user.role} tab or use the correct portal.`, "error");
          return;
        }
        const destination = await postLoginHref(
          user.role as "designer" | "customer",
          user.id
        );
        if (useSupabase) {
          const mfaPath = await resolvePostLoginMfaPath(
            user.role as "designer" | "customer",
            destination
          );
          if (mfaPath) {
            router.push(mfaPath);
            return;
          }
        }
        showToast("Welcome back!");
        router.push(destination);
        return;
      }

      setRole(loginRole);
      if (loginRole === "customer") initDemoCustomer(true);
      syncProjects();
      showToast("Welcome back!");
      router.push(await postLoginHref(loginRole));
    } catch (error) {
      const next = abuse.onFailure();
      logSecurityEvent({
        eventType: next.limited ? "login_cooldown" : "login_failed",
        email,
        meta: { portal: "member", failures: next.failures },
      });
      if (!next.limited) {
        logAccountActivity({
          eventType: "login_failed",
          email,
          meta: { portal: "member", failures: next.failures },
        });
      }
      showToast(error instanceof Error ? error.message : "Login failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const demoLogin = async (role: "designer" | "customer") => {
    setSubmitting(true);
    try {
      if (useRemote) {
        const creds = DEMO_CREDENTIALS[role];
        const user = await login(creds.email, creds.password);
        if (role === "customer") initDemoCustomer(true);
        const destination =
          DASHBOARD_ROUTES[user.role as keyof typeof DASHBOARD_ROUTES] ?? DASHBOARD_ROUTES[role];
        if (useSupabase) {
          const mfaPath = await resolvePostLoginMfaPath(
            user.role as "designer" | "customer" | "admin",
            destination
          );
          if (mfaPath) {
            router.push(mfaPath);
            return;
          }
        }
        showToast(`Continuing as ${role === "customer" ? "client" : role}`);
        router.push(destination);
        return;
      }

      setRole(role);
      if (role === "customer") initDemoCustomer(true);
      syncProjects();
      showToast(`Continuing as ${role}`);
      router.push(DASHBOARD_ROUTES[role]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Login failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const directCustomerLogin = async () => {
    setSubmitting(true);
    try {
      if (useRemote) {
        await login(DEMO_CREDENTIALS.customer.email, DEMO_CREDENTIALS.customer.password);
        initDirectCustomer();
        showToast("Continuing as direct client");
        router.push("/marketplace");
        return;
      }

      setRole("customer");
      initDirectCustomer();
      syncProjects();
      showToast("Continuing as direct client");
      router.push("/marketplace");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Login failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LoginPageShell
      mobileTitle="Welcome Back"
      eyebrow="Fashion Tech Identity"
      title="Welcome Back"
      footer={
        <>
          <LoginPortalLink href="/login/admin">Platform admin? Sign in here</LoginPortalLink>
          {allowDemoAuth && !useRemote && (
            <Card className="border-[#d3c3ba]/30 bg-card/80" padding="md">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted/70">
                Demo — Quick Access
              </p>
              <div className="mt-3 space-y-2">
                <Button
                  variant="secondary"
                  className="w-full text-sm"
                  disabled={submitting}
                  onClick={() => void demoLogin("designer")}
                >
                  Continue as Designer
                </Button>
                <Button
                  variant="secondary"
                  className="w-full text-sm"
                  disabled={submitting}
                  onClick={() => void demoLogin("customer")}
                >
                  Continue as Client (invited)
                </Button>
                <Button
                  variant="secondary"
                  className="w-full text-sm"
                  disabled={submitting}
                  onClick={() => void directCustomerLogin()}
                >
                  Continue as Direct Client
                </Button>
              </div>
            </Card>
          )}
        </>
      }
    >
      <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg bg-zinc-800/80 p-1">
        {MEMBER_ROLES.map((role) => (
          <button
            key={role.value}
            type="button"
            onClick={() => setLoginRole(role.value)}
            className={cn(
              "rounded-lg border py-2 text-xs font-semibold transition-all duration-200",
              loginRole === role.value
                ? "border-highlight bg-zinc-700 text-zinc-50"
                : "border-transparent text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200"
            )}
          >
            {role.label}
          </button>
        ))}
      </div>

      <LoginCredentialsForm
        email={email}
        password={password}
        showPassword={showPassword}
        rememberMe={rememberMe}
        submitting={submitting}
        emailPlaceholder={EMAIL_PLACEHOLDERS[loginRole]}
        submitLabel="Sign in"
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onShowPasswordToggle={() => setShowPassword((v) => !v)}
        onRememberMeChange={setRememberMe}
        onSubmit={handleLogin}
        disabled={abuse.snapshot.limited}
        requireCaptcha={abuse.showCaptcha}
        captchaSolved={abuse.captchaSolved}
        notice={
          abuse.snapshot.message ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {abuse.snapshot.message}
            </p>
          ) : null
        }
        beforeSubmit={
          <CaptchaSlot
            hostRef={abuse.captchaHostRef}
            show={abuse.showCaptcha}
            status={abuse.captchaStatus}
          />
        }
      />

      <p className="mt-6 text-center text-sm text-zinc-500">
        New to the house?{" "}
        <Link
          href={loginRole === "customer" ? "/signup/client" : "/signup/designer"}
          className="font-semibold text-highlight underline-offset-4 hover:underline"
        >
          Create account
        </Link>
      </p>
    </LoginPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <LoginPageShell mobileTitle="Welcome Back" eyebrow="Fashion Tech Identity" title="Welcome Back">
          <div className="mt-8 h-32 animate-pulse rounded-lg bg-zinc-800/40" />
        </LoginPageShell>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
