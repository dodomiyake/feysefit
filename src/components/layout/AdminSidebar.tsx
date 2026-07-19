"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  adminNavItems,
  isAdminNavActive,
} from "@/lib/admin-nav";
import { AppSidebar, SidebarCountBadge, sidebarNavClass } from "./AppSidebar";
import { SidebarLogout } from "./SidebarLogout";
import { getOpenReportedUsersCount } from "@/lib/admin-reports";

export function AdminSidebar() {
  const pathname = usePathname();
  const { unlinkRequests, getPendingMarketplaceApprovals, userReports, testimonialReports } = useApp();

  const pendingUnlinkCount = unlinkRequests.filter(
    (r) => r.status === "pending" || r.status === "designer_review"
  ).length;
  const pendingApprovalCount = getPendingMarketplaceApprovals().length;
  const openReportedUsersCount = getOpenReportedUsersCount(userReports);
  const openTestimonialReportsCount = testimonialReports.filter((item) => item.status === "open").length;

  return (
    <AppSidebar
      tagline="Admin Console"
      navClassName="overflow-y-auto"
      footer={<SidebarLogout />}
    >
      {adminNavItems.map((item) => {
        const isActive = isAdminNavActive(pathname, item);

        return (
          <Link key={item.href} href={item.href} className={sidebarNavClass(isActive)}>
            <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 1.75} />
            <span className="flex-1">{item.label}</span>
            {item.badge === "unlink" && <SidebarCountBadge count={pendingUnlinkCount} />}
            {item.badge === "approvals" && <SidebarCountBadge count={pendingApprovalCount} />}
            {item.badge === "reports" && <SidebarCountBadge count={openReportedUsersCount} />}
            {item.badge === "testimonials" && (
              <SidebarCountBadge count={openTestimonialReportsCount} />
            )}
          </Link>
        );
      })}
    </AppSidebar>
  );
}
