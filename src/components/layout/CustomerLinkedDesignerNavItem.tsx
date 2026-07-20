"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { isLinkedCustomer } from "@/lib/customer-access";
import { LINKED_DESIGNER_PAGE_HREF } from "@/lib/customer-designer-links";
import { sidebarNavClass } from "./AppSidebar";
import { cn } from "@/lib/cn";

interface CustomerLinkedDesignerNavItemProps {
  variant: "sidebar" | "bottom";
}

export function CustomerLinkedDesignerNavItem({ variant }: CustomerLinkedDesignerNavItemProps) {
  const pathname = usePathname();
  const { canAccessMarketplace, customerLink } = useApp();

  const show =
    isLinkedCustomer(customerLink) &&
    Boolean(customerLink.linkedDesignerId) &&
    !canAccessMarketplace;

  if (!show) return null;

  const isActive =
    pathname === LINKED_DESIGNER_PAGE_HREF || pathname.startsWith(`${LINKED_DESIGNER_PAGE_HREF}/`);

  const label = customerLink.linkedDesignerName?.split(" ")[0] ?? "My Designer";

  if (variant === "sidebar") {
    return (
      <Link href={LINKED_DESIGNER_PAGE_HREF} className={sidebarNavClass(isActive)}>
        <UserCircle className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 1.75} />
        <span className="flex-1 truncate">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={LINKED_DESIGNER_PAGE_HREF}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] transition-colors sm:text-xs",
        isActive ? "text-accent" : "text-primary/50 hover:text-primary"
      )}
    >
      <UserCircle className={cn("h-5 w-5 shrink-0", isActive && "stroke-[2.5]")} />
      <span className="truncate font-medium">{label}</span>
    </Link>
  );
}
