"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

interface BackButtonProps {
  href?: string;
  label?: string;
  /** Icon-only circular button (e.g. on hero images). */
  variant?: "icon" | "inline";
  className?: string;
  ariaLabel?: string;
}

export function BackButton({
  href,
  label,
  variant = "inline",
  className,
  ariaLabel = "Go back",
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
      return;
    }
    router.back();
  };

  if (variant === "icon") {
    const iconClasses = cn(
      "flex h-10 w-10 items-center justify-center rounded-full border border-primary/10 bg-background/90 text-primary shadow-warm backdrop-blur-sm transition-colors hover:bg-surface-container",
      className
    );

    if (href) {
      return (
        <Link href={href} className={iconClasses} aria-label={ariaLabel}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
      );
    }

    return (
      <button type="button" onClick={handleClick} className={iconClasses} aria-label={ariaLabel}>
        <ArrowLeft className="h-5 w-5" />
      </button>
    );
  }

  const inlineClasses = cn(
    "inline-flex items-center gap-2 text-sm font-medium text-primary/60 transition-colors hover:text-primary",
    className
  );

  if (href) {
    return (
      <Link href={href} className={inlineClasses} aria-label={ariaLabel}>
        <ArrowLeft className="h-4 w-4 shrink-0" />
        {label && <span>{label}</span>}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleClick} className={inlineClasses} aria-label={ariaLabel}>
      <ArrowLeft className="h-4 w-4 shrink-0" />
      {label && <span>{label}</span>}
    </button>
  );
}

/** Back control for desktop page content (mobile uses TopBar). */
export function DesktopBackNav({
  href,
  label = "Back",
  className,
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  return <BackButton href={href} label={label} className={cn("mb-6 hidden lg:inline-flex", className)} />;
}
