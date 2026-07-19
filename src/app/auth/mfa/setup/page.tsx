"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginPageShell } from "@/components/auth/LoginPageShell";
import { MfaTotpSetup } from "@/components/auth/MfaTotpSetup";
import { Card } from "@/components/ui/Card";
import { resolveSafeNextPath, dashboardForRole } from "@/lib/auth-routes";
import { hasVerifiedTotp, mfaPolicyForRole } from "@/lib/services/mfaService";
import { useApp } from "@/context/AppContext";
import { upsertUserPreferences } from "@/lib/services/preferenceService";
import { isSupabaseEnabled } from "@/lib/config/backend";

function MfaSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role, authUser, hydrated, showToast } = useApp();
  const required = searchParams.get("required") === "1" || mfaPolicyForRole(role).required;
  const nextPath =
    resolveSafeNextPath(searchParams.get("next")) ??
    (role ? dashboardForRole(role) : "/");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void (async () => {
      if (!authUser) {
        router.replace("/login");
        return;
      }
      const enrolled = await hasVerifiedTotp();
      if (enrolled && !cancelled) {
        router.replace(nextPath);
        return;
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser, hydrated, nextPath, router]);

  if (checking) {
    return (
      <LoginPageShell mobileTitle="MFA setup" eyebrow="Security" title="Checking MFA…">
        <Card className="border-zinc-800 bg-zinc-900/80 p-6 text-sm text-zinc-400">
          Loading…
        </Card>
      </LoginPageShell>
    );
  }

  return (
    <LoginPageShell
      mobileTitle="MFA setup"
      eyebrow="Multi-factor authentication"
      title="Protect your account"
    >
      <Card className="mt-6 border-transparent bg-transparent p-0 shadow-none">
        <MfaTotpSetup
          appearance="dark"
          required={required}
          onCancel={
            required
              ? undefined
              : () => {
                  router.replace(nextPath);
                }
          }
          onComplete={async () => {
            if (isSupabaseEnabled() && authUser?.id) {
              try {
                await upsertUserPreferences(authUser.id, { twoFactorEnabled: true });
              } catch {
                // Preference sync is best-effort; MFA factor is the source of truth.
              }
            }
            showToast("Authenticator enabled.");
            const { logAccountActivity } = await import("@/lib/account-activity");
            logAccountActivity({ eventType: "mfa_enabled", email: authUser?.email });
            router.replace(nextPath);
          }}
        />
      </Card>
    </LoginPageShell>
  );
}

export default function MfaSetupPage() {
  return (
    <Suspense
      fallback={
        <LoginPageShell mobileTitle="MFA setup" eyebrow="Security" title="Loading…">
          <Card className="border-zinc-800 bg-zinc-900/80 p-6 text-sm text-zinc-400">
            Loading…
          </Card>
        </LoginPageShell>
      }
    >
      <MfaSetupContent />
    </Suspense>
  );
}
