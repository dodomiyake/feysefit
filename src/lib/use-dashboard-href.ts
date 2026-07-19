"use client";

import { useApp } from "@/context/AppContext";
import { getDashboardHref } from "@/lib/navigation";

/** Stable until AppContext hydrates from session storage (avoids SSR/client href mismatch). */
export function useDashboardHref(): string {
  const { role, hydrated } = useApp();
  if (!hydrated) return "/login";
  return getDashboardHref(role);
}
