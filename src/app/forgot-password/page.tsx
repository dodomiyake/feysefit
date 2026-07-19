"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoginPageShell } from "@/components/auth/LoginPageShell";
import { CaptchaSlot } from "@/components/auth/CaptchaSlot";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/context/AppContext";
import { resetPasswordForEmail } from "@/lib/services/authService";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { useAuthAbuseGuard } from "@/hooks/useAuthAbuseGuard";
import { logSecurityEvent } from "@/lib/security-events";
import { GENERIC_AUTH_REQUEST_MESSAGE } from "@/lib/auth-abuse";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const { showToast } = useApp();
  const router = useRouter();
  const useSupabase = isSupabaseEnabled();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const abuse = useAuthAbuseGuard("password_reset", email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useSupabase) {
      showToast("Password reset requires Supabase authentication", "error");
      return;
    }
    const blocked = abuse.precheck();
    if (blocked) {
      showToast(blocked, "error");
      logSecurityEvent({
        eventType: abuse.snapshot.limited ? "password_reset_limited" : "captcha_required",
        email,
        meta: { flow: "password_reset" },
      });
      return;
    }
    setSubmitting(true);
    try {
      await resetPasswordForEmail(email.trim(), { captchaToken: abuse.captchaToken });
      // Count every request toward limits (anti-enumeration: always "success" UX).
      abuse.onFailure();
      logSecurityEvent({ eventType: "password_reset_requested", email });
      setSent(true);
      showToast(GENERIC_AUTH_REQUEST_MESSAGE);
    } catch {
      abuse.onFailure();
      setSent(true);
      showToast(GENERIC_AUTH_REQUEST_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LoginPageShell
      mobileTitle="Reset Password"
      eyebrow="Account Recovery"
      title="Forgot your password?"
      footer={
        <p className="text-center text-sm text-zinc-500">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-highlight hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="mt-6 rounded-lg border border-zinc-700 bg-zinc-800/60 p-5 text-sm text-zinc-300">
          <p>
            If an account exists for <span className="font-medium text-zinc-100">{email}</span>, we
            sent a password reset link. Check your inbox and spam folder.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 w-full"
            onClick={() => router.push("/login")}
          >
            Return to login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <p className="text-sm text-zinc-400">
            Enter the email on your FeyseFit account. We&apos;ll send a secure link to choose a new
            password.
          </p>
          {abuse.snapshot.message ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {abuse.snapshot.message}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block px-1 text-sm font-medium text-zinc-400">
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@atelier.com"
                className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-12 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <CaptchaSlot
            hostRef={abuse.captchaHostRef}
            show={abuse.showCaptcha}
            status={abuse.captchaStatus}
          />
          <Button
            type="submit"
            disabled={
              submitting ||
              !useSupabase ||
              abuse.snapshot.limited ||
              (abuse.showCaptcha && !abuse.captchaSolved)
            }
            className="mt-2 h-12 w-full"
            size="lg"
          >
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </LoginPageShell>
  );
}
