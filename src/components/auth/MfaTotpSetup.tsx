"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { enrollTotp, verifyTotpCode, type TotpEnrollment } from "@/lib/services/mfaService";
import { MfaCodeForm } from "@/components/auth/MfaCodeForm";
import { cn } from "@/lib/cn";

interface MfaTotpSetupProps {
  required?: boolean;
  onComplete: () => void;
  onCancel?: () => void;
  appearance?: "light" | "dark";
}

export function MfaTotpSetup({
  required = false,
  onComplete,
  onCancel,
  appearance = "dark",
}: MfaTotpSetupProps) {
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const dark = appearance === "dark";

  const startEnrollment = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await enrollTotp("FeyseFit authenticator");
      setEnrollment(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start MFA setup.");
    } finally {
      setBusy(false);
    }
  };

  if (!enrollment) {
    return (
      <div className="space-y-4">
        <div>
          <h2
            className={cn(
              "font-headline text-xl font-semibold",
              dark ? "text-zinc-50" : "text-primary"
            )}
          >
            Authenticator app (TOTP)
          </h2>
          <p className={cn("mt-2 text-sm leading-relaxed", dark ? "text-zinc-400" : "text-primary/70")}>
            Use Google Authenticator, 1Password, Authy, or any TOTP app. SMS is not required —
            authenticator apps are the primary MFA option on FeyseFit.
          </p>
          {required ? (
            <p className="mt-2 text-sm font-medium text-highlight">
              Administrators must enable MFA before using the admin portal.
            </p>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {!required && onCancel ? (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
              Not now
            </Button>
          ) : null}
          <Button type="button" onClick={() => void startEnrollment()} disabled={busy}>
            {busy ? "Preparing…" : "Set up authenticator"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2
          className={cn(
            "font-headline text-xl font-semibold",
            dark ? "text-zinc-50" : "text-primary"
          )}
        >
          Scan QR code
        </h2>
        <p className={cn("mt-1 text-sm", dark ? "text-zinc-400" : "text-primary/70")}>
          Scan with your authenticator app, then enter the 6-digit code to confirm.
        </p>
      </div>

      <div
        className={cn(
          "flex flex-col items-center gap-4 rounded-xl border p-4",
          dark ? "border-zinc-700 bg-zinc-800/60" : "border-[#d3c3ba]/25 bg-background"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={enrollment.qrCode}
          alt="Authenticator QR code"
          className="h-48 w-48 rounded-lg bg-white p-2"
        />
        <button
          type="button"
          className="text-xs font-semibold text-highlight hover:underline"
          onClick={() => setShowSecret((v) => !v)}
        >
          {showSecret ? "Hide manual key" : "Can’t scan? Show manual key"}
        </button>
        {showSecret ? (
          <p
            className={cn(
              "max-w-full break-all rounded-lg px-3 py-2 font-mono text-xs",
              dark ? "bg-zinc-900 text-zinc-200" : "bg-primary/5 text-primary"
            )}
          >
            {enrollment.secret}
          </p>
        ) : null}
      </div>

      <MfaCodeForm
        appearance={appearance}
        title="Confirm setup"
        description="Enter the code shown in your authenticator app."
        submitLabel="Enable MFA"
        onSubmit={async (code) => {
          await verifyTotpCode(enrollment.factorId, code);
          onComplete();
        }}
      />
    </div>
  );
}
