"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Calendar,
  MessageSquare,
  Inbox,
  Store,
  Settings,
} from "lucide-react";
import { AppSidebar, SidebarCountBadge, sidebarNavClass } from "./AppSidebar";
import { SidebarLogout } from "./SidebarLogout";

const navItems = [
  { href: "/dashboard/designer", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/appointments", icon: Calendar, label: "Appointments" },
  { href: "/enquiries", icon: Inbox, label: "Enquiries" },
  { href: "/messages", icon: MessageSquare, label: "Messages" },
  { href: "/marketplace", icon: Store, label: "Marketplace" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function DesignerSidebar() {
  const pathname = usePathname();
  const { getDesignerPendingConfirmations } = useApp();
  const unlinkCount = getDesignerPendingConfirmations().length;

  return (
    <AppSidebar
      tagline="Luxury Fashion Tech"
      footer={<SidebarLogout />}
    >
      {navItems.map((item) => {
        const isActive =
          item.href === "/dashboard/designer"
            ? pathname === "/dashboard/designer"
            : pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link key={item.href} href={item.href} className={sidebarNavClass(isActive)}>
            <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 1.75} />
            <span className="flex-1">{item.label}</span>
            {item.label === "Dashboard" && <SidebarCountBadge count={unlinkCount} />}
          </Link>
        );
      })}
    </AppSidebar>
  );
}
