"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS, touchAppSessionActivity } from "@/lib/auth-security";
import { isPublicPath } from "@/lib/auth-routes";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * UX warning + local activity tracking.
 * Server-side idle/absolute enforcement lives in middleware (cookie clocks).
 */
export function SessionIdleGuard() {
  const { authUser, logout, showToast } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const lastActivityRef = useRef(Date.now());
  const warningOpenRef = useRef(false);
  const lockingRef = useRef(false);
  const [warningOpen, setWarningOpen] = useState(false);

  const continueSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningOpenRef.current = false;
    setWarningOpen(false);
    touchAppSessionActivity();
  }, []);

  const lockSession = useCallback(
    async (manual: boolean) => {
      if (lockingRef.current) return;
      lockingRef.current = true;
      warningOpenRef.current = false;
      setWarningOpen(false);
      if (!manual) {
        showToast("Signed out due to inactivity. Please sign in again.", "error");
      }
      await logout();
      router.replace(`/login?next=${encodeURIComponent(pathname)}${manual ? "" : "&error=idle"}`);
      lockingRef.current = false;
    },
    [logout, pathname, router, showToast]
  );

  useEffect(() => {
    if (!authUser || isPublicPath(pathname)) return;

    lastActivityRef.current = Date.now();
    warningOpenRef.current = false;
    setWarningOpen(false);
    touchAppSessionActivity();

    const touch = () => {
      // While the warning is open, only "Continue session" resets the clock.
      if (warningOpenRef.current) return;
      lastActivityRef.current = Date.now();
      touchAppSessionActivity();
    };

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
      "mousemove",
    ];
    events.forEach((event) => window.addEventListener(event, touch, { passive: true }));

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !warningOpenRef.current) {
        touch();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const intervalId = window.setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= IDLE_TIMEOUT_MS) {
        void lockSession(false);
        return;
      }
      if (!warningOpenRef.current && idleFor >= IDLE_TIMEOUT_MS - IDLE_WARNING_MS) {
        warningOpenRef.current = true;
        setWarningOpen(true);
      }
    }, 5_000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, touch));
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(intervalId);
    };
  }, [authUser, lockSession, pathname]);

  if (!authUser || isPublicPath(pathname)) return null;

  return (
    <Modal open={warningOpen} onClose={continueSession} title="Your session is about to lock">
      <p className="text-sm leading-relaxed text-primary/80">
        For your security, you&apos;ll be signed out due to inactivity in 2 minutes.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => void lockSession(true)}>
          Sign out now
        </Button>
        <Button className="w-full sm:w-auto" onClick={continueSession}>
          Continue session
        </Button>
      </div>
    </Modal>
  );
}
