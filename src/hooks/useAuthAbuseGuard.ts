"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AuthAbuseAction,
  assertAuthAttemptAllowed,
  getAuthAbuseSnapshot,
  getTurnstileSiteKey,
  isTurnstileConfigured,
  recordAuthFailure,
  recordAuthSuccess,
} from "@/lib/auth-abuse";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          appearance?: "always" | "execute" | "interaction-only";
          size?: "normal" | "compact" | "flexible";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export type CaptchaStatus = "idle" | "loading" | "ready" | "solved" | "error";

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    );
    if (existing) {
      if (window.turnstile) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Turnstile failed to load")),
        { once: true }
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    const nonce = document.documentElement.dataset.cspNonce;
    if (nonce) script.nonce = nonce;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

/**
 * Abuse guard + always-on Turnstile when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
 * Widget mounts once (not on every email keystroke) so the human check stays stable.
 */
export function useAuthAbuseGuard(action: AuthAbuseAction, subject: string) {
  const identityKey = `${action}:${subject}`;
  const [snapshot, setSnapshot] = useState(() => getAuthAbuseSnapshot(action, subject));
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaStatus, setCaptchaStatus] = useState<CaptchaStatus>("idle");
  const [trackedKey, setTrackedKey] = useState(identityKey);
  const [hostEl, setHostEl] = useState<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = getTurnstileSiteKey();
  const showCaptcha = isTurnstileConfigured();

  const captchaHostRef = useCallback((node: HTMLDivElement | null) => {
    hostRef.current = node;
    setHostEl(node);
  }, []);

  if (trackedKey !== identityKey) {
    setTrackedKey(identityKey);
    setSnapshot(getAuthAbuseSnapshot(action, subject));
    // Keep solved captcha across email edits — remounting on every keystroke broke deploy UX.
  }

  const refresh = useCallback(() => {
    setSnapshot(getAuthAbuseSnapshot(action, subject));
  }, [action, subject]);

  useEffect(() => {
    if (!snapshot.limited) return;
    const id = window.setInterval(refresh, 1000);
    return () => window.clearInterval(id);
  }, [refresh, snapshot.limited, snapshot.cooldownUntil]);

  useEffect(() => {
    if (!showCaptcha || !siteKey) {
      const idle = window.setTimeout(() => {
        setCaptchaStatus("idle");
        setCaptchaToken(null);
      }, 0);
      return () => window.clearTimeout(idle);
    }
    if (!hostEl) {
      const loading = window.setTimeout(() => setCaptchaStatus("loading"), 0);
      return () => window.clearTimeout(loading);
    }

    let cancelled = false;
    const loading = window.setTimeout(() => {
      setCaptchaStatus("loading");
      setCaptchaToken(null);
    }, 0);

    const mount = async () => {
      try {
        await loadTurnstileScript();
        if (cancelled || !window.turnstile || !hostRef.current) {
          if (!cancelled) setCaptchaStatus("error");
          return;
        }

        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore
          }
          widgetIdRef.current = null;
        }

        hostRef.current.innerHTML = "";
        widgetIdRef.current = window.turnstile.render(hostRef.current, {
          sitekey: siteKey,
          theme: "auto",
          appearance: "always",
          size: "flexible",
          callback: (token) => {
            setCaptchaToken(token);
            setCaptchaStatus("solved");
          },
          "expired-callback": () => {
            setCaptchaToken(null);
            setCaptchaStatus("ready");
          },
          "error-callback": () => {
            setCaptchaToken(null);
            setCaptchaStatus("error");
          },
        });
        if (!cancelled) setCaptchaStatus("ready");
      } catch {
        if (!cancelled) {
          setCaptchaStatus("error");
          setCaptchaToken(null);
        }
      }
    };

    void mount();

    return () => {
      cancelled = true;
      window.clearTimeout(loading);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [showCaptcha, siteKey, hostEl]);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    setCaptchaStatus((current) => (current === "idle" ? current : "ready"));
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // ignore
      }
    }
  }, []);

  /**
   * Take the current token for a single auth request and immediately clear/reset
   * the widget. Turnstile tokens are single-use — leaving "Success!" visible after
   * submit made retries look valid while sending an already-consumed token.
   */
  const consumeCaptchaToken = useCallback(() => {
    const token = captchaToken?.trim() || null;
    setCaptchaToken(null);
    if (token) {
      setCaptchaStatus((current) => (current === "idle" ? current : "ready"));
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
    }
    return token;
  }, [captchaToken]);

  const precheck = useCallback(() => {
    return assertAuthAttemptAllowed(action, subject, captchaToken);
  }, [action, subject, captchaToken]);

  const onFailure = useCallback(() => {
    const next = recordAuthFailure(action, subject);
    setSnapshot(next);
    resetCaptcha();
    return next;
  }, [action, subject, resetCaptcha]);

  const onSuccess = useCallback(() => {
    recordAuthSuccess(action, subject);
    setSnapshot(getAuthAbuseSnapshot(action, subject));
    resetCaptcha();
  }, [action, subject, resetCaptcha]);

  return {
    snapshot,
    captchaToken,
    captchaStatus,
    captchaHostRef,
    showCaptcha,
    captchaSolved: Boolean(captchaToken?.trim()),
    turnstileConfigured: isTurnstileConfigured(),
    precheck,
    onFailure,
    onSuccess,
    resetCaptcha,
    consumeCaptchaToken,
    refresh,
  };
}
