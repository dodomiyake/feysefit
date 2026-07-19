"use client";

import { useApp } from "@/context/AppContext";
import {
  Home,
  FolderKanban,
  MessageSquare,
  Store,
  Settings,
  Users,
  Ruler,
  Shield,
  Unlink,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { AppSidebar, SidebarCountBadge, sidebarNavClass } from "./AppSidebar";
import { SidebarLogout } from "./SidebarLogout";
import { CustomerMarketplaceNavItem } from "./CustomerMarketplaceNavItem";
import { CustomerLinkedDesignerNavItem } from "./CustomerLinkedDesignerNavItem";

type NavLink = { href: string; icon: LucideIcon; label: string };

export function Sidebar() {
  const pathname = usePathname();
  const { role, getDesignerPendingConfirmations } = useApp();
  const designerUnlinkCount =
    role === "designer" ? getDesignerPendingConfirmations().length : 0;

  if (!role) return null;

  const designerLinks: NavLink[] = [
    { href: "/dashboard/designer", icon: Home, label: "Dashboard" },
    { href: "/projects", icon: FolderKanban, label: "Projects" },
    { href: "/clients", icon: Users, label: "Clients" },
    { href: "/messages", icon: MessageSquare, label: "Messages" },
    { href: "/marketplace", icon: Store, label: "Marketplace" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const customerLinks: NavLink[] = [
    { href: "/dashboard/customer", icon: Home, label: "Home" },
    { href: "/projects", icon: FolderKanban, label: "Projects" },
    { href: "/measurements", icon: Ruler, label: "Measurements" },
    { href: "/messages", icon: MessageSquare, label: "Messages" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const adminLinks: NavLink[] = [
    { href: "/dashboard/admin", icon: Shield, label: "Admin" },
    { href: "/dashboard/admin/unlink-requests", icon: Unlink, label: "Unlink Requests" },
    { href: "/dashboard/admin/designers", icon: Users, label: "Designers" },
    { href: "/dashboard/admin/customers", icon: Users, label: "Clients" },
    { href: "/marketplace", icon: Store, label: "Marketplace" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const links =
    role === "designer" ? designerLinks : role === "customer" ? customerLinks : adminLinks;

  const tagline =
    role === "admin"
      ? "Admin Console"
      : role === "designer"
        ? "Luxury Fashion Tech"
        : "Luxury Fashion Tech";

  return (
    <AppSidebar tagline={tagline} footer={<SidebarLogout />}>
      {role === "customer" ? (
        <>
          {customerLinks.slice(0, 3).map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href.includes("#") ? false : pathname.startsWith(link.href + "/"));

            return (
              <Link key={link.href} href={link.href} className={sidebarNavClass(isActive)}>
                <link.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="flex-1">{link.label}</span>
              </Link>
            );
          })}
          <CustomerMarketplaceNavItem variant="sidebar" />
          <CustomerLinkedDesignerNavItem variant="sidebar" />
          {(() => {
            const link = customerLinks[3];
            const isActive =
              pathname === link.href ||
              (link.href.includes("#") ? false : pathname.startsWith(link.href + "/"));

            return (
              <Link key={link.href} href={link.href} className={sidebarNavClass(isActive)}>
                <link.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="flex-1">{link.label}</span>
              </Link>
            );
          })()}
        </>
      ) : (
        links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href.includes("#") ? false : pathname.startsWith(link.href + "/"));

          return (
            <Link key={link.href} href={link.href} className={sidebarNavClass(isActive)}>
              <link.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 1.75} />
              <span className="flex-1">{link.label}</span>
              {role === "designer" && link.label === "Dashboard" && (
                <SidebarCountBadge count={designerUnlinkCount} />
              )}
            </Link>
          );
        })
      )}
    </AppSidebar>
  );
}
