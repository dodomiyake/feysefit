"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { hasVerifiedTotp, mfaPolicyForRole } from "@/lib/services/mfaService";

/** Shown to designers (and any encouraged roles) who have not enrolled TOTP. */
export function MfaEncouragementBanner() {
  const { role, hydrated } = useApp();
  const useSupabase = isSupabaseEnabled();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!hydrated || !useSupabase) return;
    const policy = mfaPolicyForRole(role);
    if (!policy.encouraged) return;
    let cancelled = false;
    void hasVerifiedTotp().then((enrolled) => {
      if (!cancelled) setShow(!enrolled);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, role, useSupabase]);

  if (!show) return null;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-accent/25 bg-accent/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-semibold text-primary">Protect your atelier account</p>
          <p className="mt-0.5 text-xs text-primary/70">
            We strongly recommend an authenticator app (TOTP). Once enabled, exports and other
            sensitive actions will require a code.
          </p>
        </div>
      </div>
      <Link
        href="/auth/mfa/setup"
        className="shrink-0 rounded-lg bg-accent px-3 py-2 text-center text-xs font-semibold text-white hover:opacity-90"
      >
        Set up MFA
      </Link>
    </div>
  );
}
