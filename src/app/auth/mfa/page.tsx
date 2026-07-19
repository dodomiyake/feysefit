"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginPageShell } from "@/components/auth/LoginPageShell";
import { MfaCodeForm } from "@/components/auth/MfaCodeForm";
import { Card } from "@/components/ui/Card";
import { resolveSafeNextPath, dashboardForRole } from "@/lib/auth-routes";
import {
  getMfaAssuranceLevel,
  getPrimaryTotpFactorId,
  verifyTotpCode,
} from "@/lib/services/mfaService";
import { useApp } from "@/context/AppContext";
import { isRememberSessionEnabled, startAppSession } from "@/lib/auth-security";

function MfaChallengeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role, authUser, hydrated } = useApp();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const nextPath =
    resolveSafeNextPath(searchParams.get("next")) ??
    (role ? dashboardForRole(role) : "/");

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void (async () => {
      if (!authUser) {
        router.replace("/login");
        return;
      }
      const aal = await getMfaAssuranceLevel();
      if (aal.currentLevel === "aal2") {
        router.replace(nextPath);
        return;
      }
      if (aal.nextLevel !== "aal2") {
        router.replace(nextPath);
        return;
      }
      const id = await getPrimaryTotpFactorId();
      if (!cancelled) {
        setFactorId(id);
        setReady(true);
      }
      if (!id) {
        router.replace(`/auth/mfa/setup?next=${encodeURIComponent(nextPath)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser, hydrated, nextPath, router]);

  if (!ready || !factorId) {
    return (
      <LoginPageShell mobileTitle="Verify" eyebrow="Security" title="Checking MFA…">
        <Card className="border-zinc-800 bg-zinc-900/80 p-6 text-sm text-zinc-400">
          Preparing authenticator challenge…
        </Card>
      </LoginPageShell>
    );
  }

  return (
    <LoginPageShell
      mobileTitle="Verify"
      eyebrow="Multi-factor authentication"
      title="Confirm it's you"
    >
      <Card className="mt-6 border-transparent bg-transparent p-0 shadow-none">
        <MfaCodeForm
          appearance="dark"
          title="Authenticator code"
          description="Enter the 6-digit code from your authenticator app to finish signing in."
          submitLabel="Continue"
          onSubmit={async (code) => {
            await verifyTotpCode(factorId, code);
            await startAppSession(isRememberSessionEnabled());
            router.replace(nextPath);
          }}
        />
      </Card>
    </LoginPageShell>
  );
}

export default function MfaChallengePage() {
  return (
    <Suspense
      fallback={
        <LoginPageShell mobileTitle="Verify" eyebrow="Security" title="Loading…">
          <Card className="border-zinc-800 bg-zinc-900/80 p-6 text-sm text-zinc-400">
            Loading…
          </Card>
        </LoginPageShell>
      }
    >
      <MfaChallengeContent />
    </Suspense>
  );
}
