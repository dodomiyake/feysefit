import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  Flag,
  Link2,
  Link2Off,
  PenTool,
  Users,
  Settings,
  ShieldCheck,
  Calendar,
  Contact,
  MessageSquare,
} from "lucide-react";

export type AdminNavBadge = "unlink" | "approvals" | "reports" | "testimonials";

export interface AdminNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
  badge?: AdminNavBadge;
}

export const adminNavItems: AdminNavItem[] = [
  {
    href: "/dashboard/admin",
    icon: LayoutDashboard,
    label: "Dashboard",
    exact: true,
  },
  {
    href: "/dashboard/admin/marketplace-approvals",
    icon: ClipboardCheck,
    label: "Marketplace Approvals",
    badge: "approvals",
  },
  { href: "/dashboard/admin/projects", icon: FolderKanban, label: "Projects" },
  {
    href: "/dashboard/admin/testimonials",
    icon: MessageSquare,
    label: "Testimonials",
    badge: "testimonials",
  },
  { href: "/dashboard/admin/appointments", icon: Calendar, label: "Appointments" },
  { href: "/dashboard/admin/studio-clients", icon: Contact, label: "Studio clients" },
  { href: "/dashboard/admin/relationships", icon: Link2, label: "Relationships" },
  {
    href: "/dashboard/admin/reported-users",
    icon: Flag,
    label: "Reported Users",
    badge: "reports",
  },
  { href: "/dashboard/admin/unlink-requests", icon: Link2Off, label: "Unlink Requests", badge: "unlink" },
  { href: "/dashboard/admin/designers", icon: PenTool, label: "Designers" },
  { href: "/dashboard/admin/customers", icon: Users, label: "Clients" },
  { href: "/dashboard/admin/team", icon: ShieldCheck, label: "Admin team" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function isAdminNavActive(pathname: string, item: AdminNavItem) {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
