"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useReauth } from "@/context/ReauthContext";
import { getDashboardHref } from "@/lib/navigation";

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { role, hydrated } = useApp();
  const { ensureReauth } = useReauth();
  const [reauthOk, setReauthOk] = useState(false);
  const shouldReauth = hydrated && role === "admin";
  const [prevShouldReauth, setPrevShouldReauth] = useState(shouldReauth);

  if (prevShouldReauth !== shouldReauth) {
    setPrevShouldReauth(shouldReauth);
    if (!shouldReauth && reauthOk) setReauthOk(false);
  }

  useEffect(() => {
    if (!hydrated) return;
    if (role === "admin") return;
    router.replace(role ? getDashboardHref(role) : "/login/admin");
  }, [hydrated, role, router]);

  useEffect(() => {
    if (!shouldReauth) return;

    let cancelled = false;
    void (async () => {
      const ok = await ensureReauth({ purpose: "access administrative tools" });
      if (!cancelled) setReauthOk(ok);
      if (!ok && !cancelled) {
        router.replace("/");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldReauth, ensureReauth, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-5">
        <p className="text-sm text-primary/60">Loading admin console…</p>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-5">
        <p className="text-sm text-primary/60">Redirecting…</p>
      </div>
    );
  }

  if (!reauthOk) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-5">
        <p className="text-sm text-primary/60">Confirm your identity to continue…</p>
      </div>
    );
  }

  return children;
}
