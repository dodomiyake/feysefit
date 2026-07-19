"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  Home,
  FolderKanban,
  MessageSquare,
  Settings,
  Lock,
  Ruler,
} from "lucide-react";
import { AppSidebar, sidebarNavClass } from "./AppSidebar";
import { SidebarLogout } from "./SidebarLogout";
import { CustomerMarketplaceNavItem } from "./CustomerMarketplaceNavItem";
import { CustomerLinkedDesignerNavItem } from "./CustomerLinkedDesignerNavItem";
import { useCustomerProjectsHref } from "@/lib/use-customer-project";

export function CustomerSidebar() {
  const pathname = usePathname();
  const { role } = useApp();
  const projectsHref = useCustomerProjectsHref();

  if (role !== "customer") return null;

  const navLinks = [
    {
      href: "/dashboard/customer",
      icon: Home,
      label: "Home",
      isActive: pathname === "/dashboard/customer",
    },
    {
      href: projectsHref,
      icon: FolderKanban,
      label: "Projects",
      isActive: pathname === "/projects" || pathname.startsWith("/projects/"),
    },
    {
      href: "/measurements",
      icon: Ruler,
      label: "Measurements",
      isActive: pathname === "/measurements" || pathname.startsWith("/measurements/"),
    },
    {
      href: "/messages",
      icon: MessageSquare,
      label: "Messages",
      isActive: pathname === "/messages" || pathname.startsWith("/messages/"),
    },
  ];

  const settingsActive = pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <AppSidebar
      tagline="Luxury Fashion Tech"
      footer={
        <>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-white">
              <Lock className="h-4 w-4 text-accent" />
              <p className="text-sm font-semibold">Privacy Guarantee</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              Your measurements and project details stay encrypted. Only you and your linked
              designer can access your tech specs.
            </p>
          </div>
          <SidebarLogout />
        </>
      }
    >
      {navLinks.map((item) => (
        <Link key={item.label} href={item.href} className={sidebarNavClass(item.isActive)}>
          <item.icon className="h-[18px] w-[18px]" strokeWidth={item.isActive ? 2.25 : 1.75} />
          {item.label}
        </Link>
      ))}
      <CustomerMarketplaceNavItem variant="sidebar" />
      <CustomerLinkedDesignerNavItem variant="sidebar" />
      <Link href="/settings" className={sidebarNavClass(settingsActive)}>
        <Settings className="h-[18px] w-[18px]" strokeWidth={settingsActive ? 2.25 : 1.75} />
        Settings
      </Link>
    </AppSidebar>
  );
}
