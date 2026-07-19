"use client";

import { cn } from "@/lib/cn";

/** Mount point for Cloudflare Turnstile (filled by useAuthAbuseGuard). */
export function CaptchaSlot({
  hostRef,
  show,
  className,
}: {
  hostRef: React.RefObject<HTMLDivElement | null>;
  show: boolean;
  className?: string;
}) {
  if (!show) return null;
  return (
    <div className={cn("flex justify-center py-1", className)}>
      <div ref={hostRef} />
    </div>
  );
}
