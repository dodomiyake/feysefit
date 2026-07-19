"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface MfaCodeFormProps {
  title?: string;
  description?: string;
  submitLabel?: string;
  onSubmit: (code: string) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  appearance?: "light" | "dark";
}

export function MfaCodeForm({
  title = "Authenticator code",
  description = "Open your authenticator app and enter the 6-digit code.",
  submitLabel = "Verify",
  onSubmit,
  onCancel,
  className,
  appearance = "dark",
}: MfaCodeFormProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dark = appearance === "dark";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      <div>
        <h2
          className={cn(
            "font-headline text-xl font-semibold",
            dark ? "text-zinc-50" : "text-primary"
          )}
        >
          {title}
        </h2>
        <p className={cn("mt-1 text-sm", dark ? "text-zinc-400" : "text-primary/70")}>
          {description}
        </p>
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="mfa-code"
          className={cn("block text-sm font-medium", dark ? "text-zinc-400" : "text-primary/80")}
        >
          6-digit code
        </label>
        <input
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className={cn(
            "h-12 w-full rounded-lg border px-4 text-center font-mono text-lg tracking-[0.35em] outline-none focus:border-accent focus:ring-1 focus:ring-accent",
            dark
              ? "border-zinc-700 bg-zinc-800 text-zinc-100"
              : "border-[#d3c3ba]/40 bg-background text-primary"
          )}
          placeholder="000000"
          required
          autoFocus
        />
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting || code.length !== 6}>
          {submitting ? "Verifying…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
