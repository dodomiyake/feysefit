"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MfaTotpSetup } from "@/components/auth/MfaTotpSetup";
import { useApp } from "@/context/AppContext";
import { useReauth } from "@/context/ReauthContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { isPasswordStrongEnough } from "@/lib/auth-security";
import { logAccountActivity, accountActivityLabel } from "@/lib/account-activity";
import {
  getPasswordChangedAt,
  listMyAccountActivity,
  type AccountActivityRow,
} from "@/lib/services/accountActivityService";
import {
  signOutAllDevices,
  signOutOtherSessions,
  signOutThisDevice,
  updatePassword,
} from "@/lib/services/authService";
import {
  hasVerifiedTotp,
  listVerifiedTotpFactors,
  mfaPolicyForRole,
  unenrollTotpFactor,
} from "@/lib/services/mfaService";
import { upsertUserPreferences } from "@/lib/services/preferenceService";
import { cn } from "@/lib/cn";
import {
  ArrowLeft,
  KeyRound,
  Lock,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  Activity,
} from "lucide-react";

const fieldClass =
  "signup-field w-full rounded-lg border px-4 py-3 text-primary outline-none focus:outline-none";

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Lock;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm lg:p-8">
      <div className="mb-5 flex items-start gap-3">
        <span className="rounded-lg border border-[#d3c3ba]/25 bg-background p-2">
          <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="font-headline text-lg font-semibold text-primary">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function formatWhen(iso: string | null): string {
  if (!iso) return "Not recorded yet";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AccountSecurityContent() {
  const { showToast, role, authUser, logout } = useApp();
  const { ensureReauth } = useReauth();
  const useSupabase = isSupabaseEnabled();
  const policy = mfaPolicyForRole(role);

  const [passwordChangedAt, setPasswordChangedAt] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const [mfaEnrolled, setMfaEnrolled] = useState(false);
  const [mfaChecking, setMfaChecking] = useState(useSupabase);
  const [setupOpen, setSetupOpen] = useState(false);
  const [mfaWorking, setMfaWorking] = useState(false);

  const [sessionWorking, setSessionWorking] = useState<null | "this" | "others" | "all">(null);

  const [activity, setActivity] = useState<AccountActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(useSupabase);

  const refreshMeta = useCallback(async () => {
    if (!useSupabase) {
      setMfaChecking(false);
      setActivityLoading(false);
      return;
    }
    try {
      const [changedAt, enrolled, rows] = await Promise.all([
        getPasswordChangedAt(),
        hasVerifiedTotp(),
        listMyAccountActivity(50),
      ]);
      setPasswordChangedAt(changedAt);
      setMfaEnrolled(enrolled);
      setActivity(rows);
    } catch {
      // Tables may not be deployed yet.
    } finally {
      setMfaChecking(false);
      setActivityLoading(false);
    }
  }, [useSupabase]);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrongEnough(newPassword)) {
      showToast("Password must be at least 8 characters and include a symbol.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    const ok = await ensureReauth({ purpose: "change your password" });
    if (!ok) return;

    setPasswordSubmitting(true);
    try {
      await updatePassword(newPassword);
      logAccountActivity({ eventType: "password_changed", email: authUser?.email });
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);
      setPasswordChangedAt(new Date().toISOString());
      showToast("Password updated. Other signed-in devices have been signed out.");
      void refreshMeta();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not update password", "error");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleDisableMfa = async () => {
    if (policy.required) {
      showToast("Administrators cannot disable MFA.", "error");
      return;
    }
    const ok = await ensureReauth({ purpose: "disable two-factor authentication" });
    if (!ok) return;
    setMfaWorking(true);
    try {
      const factors = await listVerifiedTotpFactors();
      for (const factor of factors) {
        await unenrollTotpFactor(factor.id);
      }
      setMfaEnrolled(false);
      if (authUser?.id) {
        await upsertUserPreferences(authUser.id, { twoFactorEnabled: false });
      }
      logAccountActivity({ eventType: "mfa_disabled", email: authUser?.email });
      showToast("Authenticator MFA disabled.");
      void refreshMeta();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not disable MFA", "error");
    } finally {
      setMfaWorking(false);
    }
  };

  const handleSignOutThis = async () => {
    setSessionWorking("this");
    try {
      if (useSupabase) {
        await signOutThisDevice();
      } else {
        await logout();
      }
      // Hard navigate so AppContext remounts without a follow-up global sign-out.
      window.location.assign("/login");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not sign out", "error");
      setSessionWorking(null);
    }
  };

  const handleSignOutOthers = async () => {
    const ok = await ensureReauth({ purpose: "sign out every other device" });
    if (!ok) return;
    setSessionWorking("others");
    try {
      await signOutOtherSessions();
      showToast("Signed out of all other devices.");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not sign out other devices",
        "error"
      );
    } finally {
      setSessionWorking(null);
    }
  };

  const handleSignOutAll = async () => {
    const ok = await ensureReauth({ purpose: "sign out all devices" });
    if (!ok) return;
    setSessionWorking("all");
    try {
      logAccountActivity({ eventType: "sign_out_all_devices", email: authUser?.email });
      // Allow the activity request to leave before cookies are cleared.
      await new Promise((r) => setTimeout(r, 150));
      if (useSupabase) {
        await signOutAllDevices();
      } else {
        await logout();
      }
      window.location.assign("/login");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not sign out", "error");
      setSessionWorking(null);
    }
  };

  const mfaStatus = mfaChecking
    ? "Checking authenticator status…"
    : mfaEnrolled
      ? "Authenticator app is enabled on this account."
      : policy.required
        ? "Required for administrators — set up an authenticator app."
        : policy.encouraged
          ? "Strongly recommended — set up an authenticator app."
          : "Optional — protect sign-in with an authenticator app.";

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to Settings
        </Link>
        <h1 className="mt-3 font-headline text-2xl font-semibold text-primary sm:text-3xl">
          Account security
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Password, two-step verification, sessions, and recent account activity.
        </p>
      </div>

      <Section
        icon={KeyRound}
        title="Password"
        description="Change your password and review when it was last updated."
      >
        <div className="mb-4 rounded-lg border border-[#d3c3ba]/20 bg-background/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Last password change
          </p>
          <p className="mt-1 text-sm text-primary">{formatWhen(passwordChangedAt)}</p>
        </div>

        {!passwordOpen ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setPasswordOpen(true)}>
            Change password
          </Button>
        ) : (
          <form onSubmit={(e) => void handlePasswordSubmit(e)} className="space-y-4">
            <p className="text-sm text-ink-muted">
              Use at least 8 characters including a symbol. Other devices will be signed out after
              you save.
            </p>
            <div className="space-y-1">
              <label htmlFor="security-new-password" className="text-xs font-semibold text-ink-muted">
                New password
              </label>
              <input
                id="security-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={fieldClass}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="security-confirm-password"
                className="text-xs font-semibold text-ink-muted"
              >
                Confirm new password
              </label>
              <input
                id="security-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={fieldClass}
                minLength={8}
                required
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={passwordSubmitting}>
                {passwordSubmitting ? "Updating…" : "Update password"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={passwordSubmitting}
                onClick={() => {
                  setPasswordOpen(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Section>

      <Section
        icon={ShieldCheck}
        title="Two-step verification"
        description="Add an authenticator app for a second factor at sign-in."
      >
        <p className="mb-4 text-sm text-primary/80">{mfaStatus}</p>
        <div className="flex flex-wrap gap-2">
          {useSupabase ? (
            mfaEnrolled ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={mfaWorking || policy.required}
                onClick={() => void handleDisableMfa()}
              >
                {policy.required ? "Required" : mfaWorking ? "Removing…" : "Remove authenticator"}
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => setSetupOpen(true)}>
                Set up authenticator app
              </Button>
            )
          ) : (
            <p className="text-sm text-ink-muted">Connect Supabase to manage authenticator MFA.</p>
          )}
        </div>

        <div className="mt-5 rounded-lg border border-[#d3c3ba]/20 bg-background/60 px-4 py-3">
          <p className="text-sm font-medium text-primary">Recovery instructions</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-muted">
            <li>
              During setup, store the manual key in a password manager — it is your backup if you
              lose the device.
            </li>
            <li>
              If you lose access to your authenticator, use{" "}
              <Link href="/forgot-password" className="font-medium text-accent hover:underline">
                password reset
              </Link>{" "}
              from a trusted device, then re-enroll MFA here.
            </li>
            <li>
              Administrators cannot disable MFA. Contact FeyseFit support if an admin account is
              locked out.
            </li>
          </ul>
        </div>
      </Section>

      <Section
        icon={MonitorSmartphone}
        title="Sessions"
        description="End access on this browser or across your other devices. Revoked tokens may remain valid until JWT expiry — keep lifetimes short in production."
      >
        <div className="space-y-3">
          <SessionAction
            title="Sign out this device"
            description="End only this browser session."
            busy={sessionWorking === "this"}
            label={sessionWorking === "this" ? "Signing out…" : "Sign out"}
            onClick={() => void handleSignOutThis()}
          />
          <SessionAction
            title="Sign out all other devices"
            description="Keep this session; revoke every other refresh session."
            busy={sessionWorking === "others"}
            label={sessionWorking === "others" ? "Signing out…" : "Sign out others"}
            onClick={() => void handleSignOutOthers()}
            disabled={!useSupabase}
          />
          <SessionAction
            title="Sign out all devices"
            description="Revoke every session, including this one."
            busy={sessionWorking === "all"}
            label={sessionWorking === "all" ? "Signing out…" : "Sign out everywhere"}
            onClick={() => void handleSignOutAll()}
            danger
          />
        </div>
      </Section>

      <Section
        icon={Activity}
        title="Account activity"
        description="Recent important security events. Locations use a coarse network hint — full IP addresses are not shown."
      >
        {activityLoading ? (
          <p className="text-sm text-ink-muted">Loading activity…</p>
        ) : activity.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No recorded activity yet. Events appear after sign-in, password changes, MFA updates,
            and sign-out-all requests
            {useSupabase ? " (requires the account security SQL patch)." : "."}
          </p>
        ) : (
          <ul className="divide-y divide-[#d3c3ba]/20">
            {activity.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
              >
                <div>
                  <p className="text-sm font-medium text-primary">
                    {accountActivityLabel(row.eventType)}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {[row.deviceHint, row.ipHint].filter(Boolean).join(" · ") ||
                      "Device details hidden"}
                  </p>
                </div>
                <time
                  dateTime={row.createdAt}
                  className="shrink-0 text-xs text-ink-muted sm:text-right"
                >
                  {formatWhen(row.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Modal open={setupOpen} onClose={() => setSetupOpen(false)} title="Set up authenticator">
        <MfaTotpSetup
          appearance="light"
          required={policy.required}
          onCancel={() => setSetupOpen(false)}
          onComplete={() => {
            setMfaEnrolled(true);
            setSetupOpen(false);
            if (authUser?.id) {
              void upsertUserPreferences(authUser.id, { twoFactorEnabled: true });
            }
            logAccountActivity({ eventType: "mfa_enabled", email: authUser?.email });
            showToast("Authenticator enabled.");
            void refreshMeta();
          }}
        />
      </Modal>
    </div>
  );
}

function SessionAction({
  title,
  description,
  label,
  busy,
  onClick,
  disabled,
  danger,
}: {
  title: string;
  description: string;
  label: string;
  busy: boolean;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#d3c3ba]/20 bg-background/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-primary">{title}</p>
        <p className="text-xs text-ink-muted">{description}</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy || disabled}
        onClick={onClick}
        className={cn(danger && "border-red-200 text-red-700 hover:bg-red-50")}
      >
        <LogOut className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
        {label}
      </Button>
    </div>
  );
}
