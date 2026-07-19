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
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

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
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Turnstile failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

export function useAuthAbuseGuard(action: AuthAbuseAction, subject: string) {
  const [snapshot, setSnapshot] = useState(() => getAuthAbuseSnapshot(action, subject));
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = getTurnstileSiteKey();

  const refresh = useCallback(() => {
    setSnapshot(getAuthAbuseSnapshot(action, subject));
  }, [action, subject]);

  useEffect(() => {
    refresh();
    if (!snapshot.limited) return;
    const id = window.setInterval(refresh, 1000);
    return () => window.clearInterval(id);
  }, [refresh, snapshot.limited, snapshot.cooldownUntil]);

  useEffect(() => {
    setCaptchaToken(null);
    refresh();
  }, [subject, action, refresh]);

  useEffect(() => {
    if (!snapshot.requiresCaptcha || !siteKey || !hostRef.current) {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await loadTurnstileScript();
        if (cancelled || !hostRef.current || !window.turnstile) return;
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
        hostRef.current.innerHTML = "";
        widgetIdRef.current = window.turnstile.render(hostRef.current, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token) => setCaptchaToken(token),
          "expired-callback": () => setCaptchaToken(null),
          "error-callback": () => setCaptchaToken(null),
        });
      } catch {
        // Widget unavailable — assertAuthAttemptAllowed may still block if captcha required.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [snapshot.requiresCaptcha, siteKey, subject]);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // ignore
      }
    }
  }, []);

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
    captchaHostRef: hostRef,
    showCaptcha: snapshot.requiresCaptcha && isTurnstileConfigured(),
    turnstileConfigured: isTurnstileConfigured(),
    precheck,
    onFailure,
    onSuccess,
    refresh,
  };
}
