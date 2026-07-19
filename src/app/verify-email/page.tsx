"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginPageShell } from "@/components/auth/LoginPageShell";
import { CaptchaSlot } from "@/components/auth/CaptchaSlot";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { resendSignupConfirmation } from "@/lib/services/authService";
import { useAuthAbuseGuard } from "@/hooks/useAuthAbuseGuard";
import { logSecurityEvent } from "@/lib/security-events";
import { GENERIC_AUTH_RESEND_MESSAGE } from "@/lib/auth-abuse";
import { Mail } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, authUser, hydrated } = useApp();
  const useSupabase = isSupabaseEnabled();
  const emailParam = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(emailParam);
  const [prevEmailParam, setPrevEmailParam] = useState(emailParam);
  const [submitting, setSubmitting] = useState(false);
  const abuse = useAuthAbuseGuard("verification_resend", email);

  if (emailParam !== prevEmailParam) {
    setPrevEmailParam(emailParam);
    if (emailParam) setEmail(emailParam);
  }

  useEffect(() => {
    if (!hydrated) return;
    if (authUser?.emailConfirmed) {
      router.replace(
        authUser.role === "designer"
          ? "/dashboard/designer"
          : authUser.role === "admin"
            ? "/dashboard/admin"
            : "/dashboard/customer"
      );
    }
  }, [authUser, hydrated, router]);

  const handleResend = async () => {
    if (!useSupabase) {
      showToast("Email verification requires Supabase authentication", "error");
      return;
    }
    if (!email.trim()) {
      showToast("Enter the email address you registered with.", "error");
      return;
    }
    const blocked = abuse.precheck();
    if (blocked) {
      showToast(blocked, "error");
      logSecurityEvent({
        eventType: abuse.snapshot.limited
          ? "verification_resend_limited"
          : "captcha_required",
        email,
        meta: { flow: "verification_resend" },
      });
      return;
    }
    setSubmitting(true);
    try {
      await resendSignupConfirmation(email, { captchaToken: abuse.captchaToken });
      abuse.onFailure();
      logSecurityEvent({ eventType: "verification_resend", email });
      showToast(GENERIC_AUTH_RESEND_MESSAGE);
    } catch {
      abuse.onFailure();
      showToast(GENERIC_AUTH_RESEND_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LoginPageShell
      mobileTitle="Verify Email"
      eyebrow="Account Security"
      title="Verify your email"
      footer={
        <p className="text-center text-sm text-zinc-500">
          Already verified?{" "}
          <Link href="/login" className="font-semibold text-highlight hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="mt-6 space-y-4 rounded-lg border border-zinc-700 bg-zinc-800/60 p-5 text-sm text-zinc-300">
        <p>
          We sent a verification link
          {email ? (
            <>
              {" "}
              to <span className="font-medium text-zinc-100">{email}</span>
            </>
          ) : null}
          . Confirm your email to open your dashboard.
        </p>
        <p className="text-zinc-400">
          Didn&apos;t get it? Check spam, or resend the verification email below.
        </p>
        {abuse.snapshot.message ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {abuse.snapshot.message}
          </p>
        ) : null}
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@atelier.com"
            className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2.5 pl-12 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <CaptchaSlot
          hostRef={abuse.captchaHostRef}
          show={abuse.showCaptcha}
          status={abuse.captchaStatus}
        />
        <Button
          type="button"
          disabled={
            submitting ||
            !useSupabase ||
            abuse.snapshot.limited ||
            (abuse.showCaptcha && !abuse.captchaSolved)
          }
          className="w-full"
          onClick={() => void handleResend()}
        >
          {submitting ? "Sending…" : "Resend verification email"}
        </Button>
      </div>
    </LoginPageShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <LoginPageShell mobileTitle="Verify Email" eyebrow="Account Security" title="Verify your email">
          <div className="mt-8 h-32 animate-pulse rounded-lg bg-zinc-800/40" />
        </LoginPageShell>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
