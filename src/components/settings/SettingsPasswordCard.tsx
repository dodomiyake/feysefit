"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/context/AppContext";
import { useReauth } from "@/context/ReauthContext";
import { updatePassword } from "@/lib/services/authService";
import { isPasswordStrongEnough } from "@/lib/auth-security";
import { logAccountActivity } from "@/lib/account-activity";
import { ChevronDown, KeyRound } from "lucide-react";
import { cn } from "@/lib/cn";

const fieldClass =
  "signup-field w-full rounded-lg border px-4 py-3 text-primary outline-none focus:outline-none";

export function SettingsPasswordCard() {
  const { showToast, authUser } = useApp();
  const { ensureReauth } = useReauth();
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrongEnough(newPassword)) {
      showToast("Password must be at least 12 characters.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    const ok = await ensureReauth({ purpose: "change your password" });
    if (!ok) return;

    setSubmitting(true);
    try {
      await updatePassword(newPassword);
      logAccountActivity({ eventType: "password_changed", email: authUser?.email });
      setNewPassword("");
      setConfirmPassword("");
      setOpen(false);
      showToast("Password updated. Other signed-in devices have been signed out.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not update password", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container shadow-warm transition-shadow duration-200 hover:shadow-md">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left"
      >
        <span className="rounded-lg border border-[#d3c3ba]/25 bg-background p-2">
          <KeyRound className="h-5 w-5 text-primary" strokeWidth={1.75} />
        </span>
        <h2 className="min-w-0 flex-1 font-headline text-lg font-semibold text-primary">
          Change password
        </h2>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-primary/50 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 border-t border-[#d3c3ba]/20 px-5 pb-5 pt-4"
        >
          <p className="text-sm text-ink-muted">
            Choose a strong password (at least 12 characters). Passphrases and password-manager secrets are both fine. Other devices will
            be signed out after you save.
          </p>
          <div className="space-y-1">
            <label htmlFor="settings-new-password" className="text-xs font-semibold text-ink-muted">
              New password
            </label>
            <input
              id="settings-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={fieldClass}
              minLength={12}
              required
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="settings-confirm-password"
              className="text-xs font-semibold text-ink-muted"
            >
              Confirm new password
            </label>
            <input
              id="settings-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={fieldClass}
              minLength={12}
              required
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" disabled={submitting}>
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
