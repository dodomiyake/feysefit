"use client";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/cn";
import { useCustomerProjectsHref } from "@/lib/use-customer-project";
import { Home, FolderKanban, MessageSquare, User, Ruler, Store, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { CustomerMarketplaceNavItem } from "./CustomerMarketplaceNavItem";
import { CustomerLinkedDesignerNavItem } from "./CustomerLinkedDesignerNavItem";

type NavItem = { href: string; icon: LucideIcon; label: string; isActive: (pathname: string) => boolean };

const designerNav: NavItem[] = [
  {
    href: "/dashboard/designer",
    icon: Home,
    label: "Home",
    isActive: (pathname) => pathname === "/dashboard/designer",
  },
  {
    href: "/projects",
    icon: FolderKanban,
    label: "Projects",
    isActive: (pathname) => pathname === "/projects" || pathname.startsWith("/projects/"),
  },
  {
    href: "/clients",
    icon: Users,
    label: "Clients",
    isActive: (pathname) => pathname === "/clients" || pathname.startsWith("/clients/"),
  },
  {
    href: "/messages",
    icon: MessageSquare,
    label: "Messages",
    isActive: (pathname) => pathname === "/messages" || pathname.startsWith("/messages/"),
  },
  {
    href: "/marketplace",
    icon: Store,
    label: "Marketplace",
    isActive: (pathname) => pathname === "/marketplace" || pathname.startsWith("/marketplace/"),
  },
  {
    href: "/settings",
    icon: User,
    label: "Profile",
    isActive: (pathname) => pathname === "/settings" || pathname.startsWith("/settings/"),
  },
];

function CustomerBottomNav() {
  const pathname = usePathname();
  const projectsHref = useCustomerProjectsHref();

  const customerNav: NavItem[] = [
    {
      href: "/dashboard/customer",
      icon: Home,
      label: "Home",
      isActive: (path) => path === "/dashboard/customer",
    },
    {
      href: projectsHref,
      icon: FolderKanban,
      label: "Projects",
      isActive: (path) => path === "/projects" || path.startsWith("/projects/"),
    },
    {
      href: "/measurements",
      icon: Ruler,
      label: "Measure",
      isActive: (path) => path === "/measurements" || path.startsWith("/measurements/"),
    },
    {
      href: "/messages",
      icon: MessageSquare,
      label: "Messages",
      isActive: (path) => path === "/messages" || path.startsWith("/messages/"),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/10 bg-background/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1 py-2">
        {customerNav.map((item) => {
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] transition-colors sm:text-xs",
                active ? "text-accent" : "text-primary/50 hover:text-primary"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", active && "stroke-[2.5]")} />
              <span className="truncate font-medium">{item.label}</span>
            </Link>
          );
        })}
        <CustomerMarketplaceNavItem variant="bottom" />
        <CustomerLinkedDesignerNavItem variant="bottom" />
        <Link
          href="/settings"
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] transition-colors sm:text-xs",
            pathname === "/settings" || pathname.startsWith("/settings/")
              ? "text-accent"
              : "text-primary/50 hover:text-primary"
          )}
        >
          <User
            className={cn(
              "h-5 w-5 shrink-0",
              (pathname === "/settings" || pathname.startsWith("/settings/")) && "stroke-[2.5]"
            )}
          />
          <span className="truncate font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { role } = useApp();

  if (!role || role === "admin") return null;

  if (role === "designer") {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/10 bg-background/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around px-1 py-2">
          {designerNav.map((item) => {
            const isActive = item.isActive(pathname);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] transition-colors sm:text-xs",
                  isActive ? "text-accent" : "text-primary/50 hover:text-primary"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "stroke-[2.5]")} />
                <span className="truncate font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return <CustomerBottomNav />;
}
