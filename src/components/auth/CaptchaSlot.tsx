"use client";

import { cn } from "@/lib/cn";
import type { CaptchaStatus } from "@/hooks/useAuthAbuseGuard";

/** Mount point for Cloudflare Turnstile (filled by useAuthAbuseGuard). */
export function CaptchaSlot({
  hostRef,
  show,
  status = "idle",
  className,
}: {
  hostRef: React.RefObject<HTMLDivElement | null> | ((node: HTMLDivElement | null) => void);
  show: boolean;
  status?: CaptchaStatus;
  className?: string;
}) {
  if (!show) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-center text-xs font-medium text-zinc-400">
        Verify you are human before continuing
      </p>
      <div className="flex min-h-[65px] flex-col items-center justify-center py-1">
        {status === "loading" ? (
          <p className="text-xs text-zinc-500">Loading security check…</p>
        ) : null}
        {status === "error" ? (
          <p className="mb-2 max-w-xs text-center text-xs text-red-400">
            Security check could not load. Refresh the page, or confirm this domain is allowed in
            Cloudflare Turnstile.
          </p>
        ) : null}
        {status === "ready" ? (
          <p className="mb-2 max-w-xs text-center text-xs text-zinc-500">
            Complete the check below, then submit once. The Success mark is single-use.
          </p>
        ) : null}
        <div ref={hostRef} className="flex min-h-[65px] w-full max-w-[320px] justify-center" />
      </div>
    </div>
  );
}
