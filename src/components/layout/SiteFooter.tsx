import Link from "next/link";
import { cn } from "@/lib/cn";

const FOOTER_LINKS = [
  { href: "/settings", label: "Support" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
] as const;

interface SiteFooterProps {
  variant?: "dashboard" | "auth";
  showOnMobile?: boolean;
  className?: string;
}

export function SiteFooter({
  variant = "dashboard",
  showOnMobile = false,
  className,
}: SiteFooterProps) {
  const links = (
    <div className="flex flex-wrap gap-6">
      {FOOTER_LINKS.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="transition-colors hover:text-accent"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );

  if (variant === "auth") {
    return (
      <footer
        className={cn(
          "w-full shrink-0 border-t border-[#d3c3ba]/40 bg-background px-5 py-6 text-xs text-ink-muted lg:px-16",
          className
        )}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p>© 2026 FeyseFit. All rights reserved.</p>
          {links}
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={cn(
        "mt-auto w-full shrink-0 border-t border-zinc-800 bg-brand-dark px-5 py-6 text-xs text-zinc-500 sm:px-16",
        showOnMobile ? "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" : "hidden lg:flex lg:justify-between",
        className
      )}
    >
      <p>© 2026 FeyseFit. All rights reserved.</p>
      {links}
    </footer>
  );
}
