"use client";

/**
 * Fire-and-forget security event logger (client → server).
 * Never include passwords or raw secrets in meta.
 */
export function logSecurityEvent(input: {
  eventType: string;
  email?: string;
  meta?: Record<string, unknown>;
}) {
  if (typeof window === "undefined") return;
  void fetch("/auth/security-event", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: input.eventType,
      email: input.email,
      meta: input.meta ?? {},
    }),
  }).catch(() => {
    // Non-blocking
  });
}
