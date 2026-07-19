import { cn } from "@/lib/cn";

interface BrandLogoProps {
  /** Use white “Fit” on dark backgrounds (sidebar). Dark brown on light pages. */
  onDark?: boolean;
  className?: string;
}

/** FeyseFit wordmark — Inter bold, tight tracking. */
export function BrandLogo({ onDark = false, className }: BrandLogoProps) {
  return (
    <span className={cn("font-brand font-bold tracking-tight", className)}>
      <span className="text-accent">Feyse</span>
      <span className={onDark ? "text-white" : "text-primary"}>Fit</span>
    </span>
  );
}
