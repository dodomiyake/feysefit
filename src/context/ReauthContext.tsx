"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { GENERIC_LOGIN_ERROR } from "@/lib/auth-security";

type EnsureReauthOptions = {
  /** Shown in the modal body so the user knows why step-up is required. */
  purpose?: string;
};

type ReauthContextValue = {
  /** Returns true if reauth is valid (existing or freshly confirmed). False if cancelled. */
  ensureReauth: (options?: EnsureReauthOptions) => Promise<boolean>;
};

const ReauthContext = createContext<ReauthContextValue | null>(null);

async function fetchReauthStatus(): Promise<{ valid: boolean; mfaEnabled: boolean }> {
  try {
    const res = await fetch("/auth/reauth", { method: "GET", credentials: "same-origin" });
    if (!res.ok) return { valid: false, mfaEnabled: false };
    const data = (await res.json()) as { valid?: boolean; mfaEnabled?: boolean };
    return { valid: Boolean(data.valid), mfaEnabled: Boolean(data.mfaEnabled) };
  } catch {
    return { valid: false, mfaEnabled: false };
  }
}

export function ReauthProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState<string>("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  const closeWith = useCallback((ok: boolean) => {
    setOpen(false);
    setPassword("");
    setCode("");
    setError(null);
    setSubmitting(false);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(ok);
  }, []);

  const ensureReauth = useCallback(async (options?: EnsureReauthOptions) => {
    const status = await fetchReauthStatus();
    if (status.valid) return true;

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setPurpose(options?.purpose?.trim() || "continue with this sensitive action");
      setPassword("");
      setCode("");
      setError(null);
      setMfaEnabled(status.mfaEnabled);
      setOpen(true);
    });
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (mfaEnabled) {
        if (!/^\d{6}$/.test(code.trim())) {
          setError("Enter the 6-digit code from your authenticator app.");
          return;
        }
      } else if (!password.trim()) {
        setError("Enter your password to continue.");
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/auth/reauth", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mfaEnabled ? { code } : { password }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          mfaEnabled?: boolean;
        };
        if (data.mfaEnabled) setMfaEnabled(true);
        if (!res.ok || !data.ok) {
          setError(data.error || GENERIC_LOGIN_ERROR);
          setSubmitting(false);
          return;
        }
        closeWith(true);
      } catch {
        setError("Could not verify your identity. Try again.");
        setSubmitting(false);
      }
    },
    [closeWith, code, mfaEnabled, password]
  );

  const value = useMemo(() => ({ ensureReauth }), [ensureReauth]);

  return (
    <ReauthContext.Provider value={value}>
      {children}
      <Modal open={open} onClose={() => closeWith(false)} title="Confirm it's you">
        <p className="text-sm leading-relaxed text-primary/80">
          {mfaEnabled
            ? `For your security, enter your authenticator code to ${purpose}.`
            : `For your security, enter your password again to ${purpose}.`}
        </p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          {mfaEnabled ? (
            <div className="space-y-1">
              <label htmlFor="reauth-code" className="text-xs font-semibold text-ink-muted">
                Authenticator code
              </label>
              <input
                id="reauth-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="signup-field w-full rounded-lg border px-4 py-3 text-center font-mono tracking-[0.3em] text-primary outline-none focus:outline-none"
                required
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label htmlFor="reauth-password" className="text-xs font-semibold text-ink-muted">
                Password
              </label>
              <input
                id="reauth-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="signup-field w-full rounded-lg border px-4 py-3 text-primary outline-none focus:outline-none"
                required
                autoFocus
              />
            </div>
          )}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => closeWith(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
              {submitting ? "Verifying…" : "Continue"}
            </Button>
          </div>
        </form>
      </Modal>
    </ReauthContext.Provider>
  );
}

export function useReauth() {
  const ctx = useContext(ReauthContext);
  if (!ctx) {
    throw new Error("useReauth must be used within ReauthProvider");
  }
  return ctx;
}
