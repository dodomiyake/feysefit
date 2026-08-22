"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";
import { LoginPageShell } from "@/components/auth/LoginPageShell";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/context/AppContext";
import { updatePassword, signOut } from "@/lib/services/authService";
import { clearAppSessionMarkers, isPasswordStrongEnough } from "@/lib/auth-security";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { logAccountActivity } from "@/lib/account-activity";

export default function ResetPasswordPage() {
  const { showToast } = useApp();
  const router = useRouter();
  const useSupabase = isSupabaseEnabled();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(!useSupabase);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!useSupabase) return;
    void createClient()
      .auth.getSession()
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, [useSupabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrongEnough(password)) {
      showToast("Password must be at least 12 characters.", "error");
      return;
    }
    if (password !== confirm) {
      showToast("Passwords do not match", "error");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      logAccountActivity({ eventType: "password_changed" });
      clearAppSessionMarkers();
      try {
        await signOut();
      } catch {
        // Password already updated — still send user to login.
      }
      showToast("Password updated. Please sign in with your new password.");
      router.push("/login");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not update password", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LoginPageShell
      mobileTitle="New Password"
      eyebrow="Account Recovery"
      title="Choose a new password"
      footer={
        <p className="text-center text-sm text-zinc-500">
          <Link href="/login" className="font-semibold text-highlight hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      {!ready ? (
        <div className="mt-8 h-24 animate-pulse rounded-lg bg-zinc-800/60" />
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <p className="text-sm text-zinc-400">
            Enter a new password for your account. You&apos;ll use it the next time you sign in.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="password" className="block px-1 text-sm font-medium text-zinc-400">
              New password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 12 characters"
                className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-12 pr-12 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-accent"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm" className="block px-1 text-sm font-medium text-zinc-400">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                id="confirm"
                type={showPassword ? "text" : "password"}
                required
                minLength={12}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-12 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={submitting || !useSupabase}
            className="mt-2 h-12 w-full"
            size="lg"
          >
            {submitting ? "Saving…" : "Update password"}
          </Button>
        </form>
      )}
    </LoginPageShell>
  );
}
