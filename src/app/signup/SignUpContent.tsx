"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BackButton } from "@/components/ui/BackButton";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SignUpEditorialPanel } from "@/components/signup/SignUpEditorialPanel";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { signUp } from "@/lib/services/authService";
import { isPasswordStrongEnough } from "@/lib/auth-security";
import { normalizeInviteCode } from "@/lib/invite-link";
import { useAuthAbuseGuard } from "@/hooks/useAuthAbuseGuard";
import { logSecurityEvent } from "@/lib/security-events";
import { CaptchaSlot } from "@/components/auth/CaptchaSlot";
import { cn } from "@/lib/cn";
import { Eye, EyeOff, Paintbrush, ShoppingBag } from "lucide-react";

const ROLE_OPTIONS = [
  {
    value: "designer" as const,
    label: "Designer",
    sublabel: "I create",
    icon: Paintbrush,
  },
  {
    value: "customer" as const,
    label: "Client",
    sublabel: "I discover",
    icon: ShoppingBag,
  },
];

const CUSTOMER_PATH_OPTIONS = [
  {
    value: "direct" as const,
    label: "Find a designer on the marketplace",
    desc: "Browse artisans and request a commission",
  },
  {
    value: "invite" as const,
    label: "I have a designer invite code",
    desc: "Your designer sent you a private link",
  },
];

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setRole, showToast, login } = useApp();
  const [role, setLocalRole] = useState<"designer" | "customer">(
    (searchParams.get("role") as "designer" | "customer") || "designer"
  );
  const [customerPath, setCustomerPath] = useState<"invite" | "direct">("direct");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const useSupabase = isSupabaseEnabled();
  const abuse = useAuthAbuseGuard("signup", email);

  useEffect(() => {
    const inviteParam = searchParams.get("invite") ?? searchParams.get("code");
    if (!inviteParam) return;

    const normalized = normalizeInviteCode(inviteParam);
    setLocalRole("customer");
    setCustomerPath("invite");
    setInviteCode(normalized);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setTermsError(true);
      showToast("Please accept the Terms of Service and Privacy Policy");
      return;
    }
    if (!isPasswordStrongEnough(password)) {
      setFormError("Password must be at least 8 characters and include a symbol.");
      showToast("Password must be at least 8 characters and include a symbol.", "error");
      return;
    }
    const blocked = abuse.precheck();
    if (blocked) {
      setFormError(blocked);
      showToast(blocked, "error");
      logSecurityEvent({
        eventType: abuse.snapshot.limited ? "auth_rate_limited" : "captcha_required",
        email,
        meta: { flow: "signup" },
      });
      return;
    }
    setTermsError(false);
    setFormError(null);
    setSubmitting(true);
    try {
      if (useSupabase) {
        const result = await signUp({
          email,
          password,
          name,
          role,
          customerPath: role === "customer" ? customerPath : undefined,
          inviteCode:
            role === "customer" && customerPath === "invite"
              ? normalizeInviteCode(inviteCode)
              : undefined,
          captchaToken: abuse.captchaToken,
        });
        abuse.onSuccess();
        logSecurityEvent({ eventType: "signup_succeeded", email, meta: { role } });

        if (result.needsEmailConfirmation) {
          showToast("Account created! Check your email to verify your account.");
          router.push(`/verify-email?email=${encodeURIComponent(result.email)}`);
          return;
        }

        await login(email, password, { captchaToken: abuse.captchaToken });
        showToast("Account created successfully!");
      } else {
        setRole(role);
        showToast("Account created successfully!");
      }
      if (role === "designer") {
        router.push("/onboarding/designer");
        return;
      }
      router.push(
        customerPath === "direct" ? "/onboarding/customer/direct" : "/onboarding/customer"
      );
    } catch (error) {
      const next = abuse.onFailure();
      logSecurityEvent({
        eventType: next.limited ? "auth_rate_limited" : "signup_failed",
        email,
        meta: { failures: next.failures },
      });
      const message = error instanceof Error ? error.message : "Signup failed";
      setFormError(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <TopBar title="Create Account" showBack backHref="/" />
      </div>

      <main className="flex min-h-screen flex-col lg:flex-row">
        <SignUpEditorialPanel />

        <div className="flex min-h-0 w-full flex-1 lg:min-h-screen lg:w-1/2 lg:overflow-y-auto">
          <div className="signup-fade-in mx-auto flex w-full max-w-[560px] flex-col px-5 py-8 pb-12 lg:px-12 lg:py-12 lg:pb-16">
            <BackButton href="/" label="Back to home" className="mb-5 hidden text-sm lg:inline-flex" />

            <div className="mb-5 lg:hidden">
              <BrandLogo className="text-3xl font-extrabold tracking-tight" />
            </div>

            <header className="mb-6 text-center lg:text-left">
              <h1 className="text-xl font-semibold text-primary">
                Create Account
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                Begin your journey into the world of luxury tech.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-3">
                <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                  Select your role
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLocalRole(opt.value)}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all duration-300",
                        role === opt.value
                          ? "border-accent bg-accent/10"
                          : "border-[#d3c3ba] bg-surface hover:bg-surface-container"
                      )}
                    >
                      <opt.icon
                        className={cn(
                          "mb-1.5 h-6 w-6",
                          role === opt.value ? "text-accent" : "text-accent/70"
                        )}
                        strokeWidth={1.5}
                      />
                      <span className="text-base font-semibold text-primary">{opt.label}</span>
                      <span className="mt-0.5 text-[11px] font-semibold text-ink-muted">
                        {opt.sublabel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {role === "customer" && (
                <div className="space-y-2.5">
                  <span className="text-sm font-medium text-primary">How are you joining?</span>
                  <div className="grid gap-2.5">
                    {CUSTOMER_PATH_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCustomerPath(opt.value)}
                        className={cn(
                          "rounded-xl border-2 p-3.5 text-left transition-all",
                          customerPath === opt.value
                            ? "border-accent bg-accent/10"
                            : "border-[#d3c3ba] bg-surface hover:bg-surface-container"
                        )}
                      >
                        <p className="text-sm font-medium text-primary">{opt.label}</p>
                        <p className="mt-0.5 text-[11px] text-ink-muted">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                  {customerPath === "invite" && (
                    <Input
                      label="Invite code"
                      id="inviteCode"
                      placeholder="FF-XXXXXX"
                      required
                      className="signup-field"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    />
                  )}
                </div>
              )}

              <div className="space-y-3.5">
                <Input
                  label="Full Name"
                  id="name"
                  placeholder="Your full name"
                  required
                  className="signup-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  label="Email Address"
                  id="email"
                  type="email"
                  placeholder="you@email.com"
                  required
                  className="signup-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-medium tracking-wide text-primary">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(
                        "signup-field w-full rounded-lg border px-4 pr-12 text-primary placeholder:text-primary/40 transition-colors outline-none focus:outline-none"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-primary"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-ink-muted/70">
                    Minimum 8 characters with at least one symbol.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (e.target.checked) setTermsError(false);
                  }}
                  className={cn(
                    "mt-1 h-5 w-5 rounded border-[#d3c3ba] bg-surface text-accent focus:ring-accent",
                    termsError && "border-red-500"
                  )}
                />
                <label htmlFor="terms" className="text-sm leading-snug text-ink-muted">
                  I agree to the{" "}
                  <Link href="/terms" className="text-accent underline underline-offset-4 hover:opacity-70">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-accent underline underline-offset-4 hover:opacity-70">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>

              {formError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </p>
              )}

              {abuse.snapshot.message ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {abuse.snapshot.message}
                </p>
              ) : null}

              <CaptchaSlot hostRef={abuse.captchaHostRef} show={abuse.showCaptcha} />

              <div className="space-y-3 pt-1">
                <Button
                  type="submit"
                  disabled={submitting || abuse.snapshot.limited}
                  className="h-12 w-full text-base shadow-lg hover:shadow-xl"
                  size="lg"
                >
                  {submitting ? "Creating account..." : "Create Account"}
                </Button>
                <p className="text-center text-sm text-ink-muted">
                  Already a member?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
