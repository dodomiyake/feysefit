"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/context/AppContext";
import { sidebarNavClass } from "./AppSidebar";

interface CustomerMarketplaceNavItemProps {
  variant: "sidebar" | "bottom";
}

export function CustomerMarketplaceNavItem({ variant }: CustomerMarketplaceNavItemProps) {
  const pathname = usePathname();
  const { canAccessMarketplace } = useApp();

  if (!canAccessMarketplace) {
    return null;
  }

  const isActive =
    pathname === "/marketplace" || pathname.startsWith("/marketplace/");

  if (variant === "sidebar") {
    return (
      <Link href="/marketplace" className={sidebarNavClass(isActive)}>
        <Store className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 1.75} />
        Marketplace
      </Link>
    );
  }

  return (
    <Link
      href="/marketplace"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] transition-colors sm:text-xs",
        isActive ? "text-accent" : "text-primary/50 hover:text-primary"
      )}
    >
      <Store className={cn("h-5 w-5 shrink-0", isActive && "stroke-[2.5]")} />
      <span className="truncate font-medium">Marketplace</span>
    </Link>
  );
}
