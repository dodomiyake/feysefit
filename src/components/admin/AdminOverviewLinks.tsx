"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  FolderKanban,
  Flag,
  Link2,
  Link2Off,
  PenTool,
  Users,
  ShieldCheck,
  Contact,
  Calendar,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getOpenReportedUsersCount } from "@/lib/admin-reports";
import { isPendingCustomerRequest } from "@/lib/local-customer";

export function AdminOverviewLinks() {
  const {
    getPendingMarketplaceApprovals,
    unlinkRequests,
    userReports,
    projects,
    designers,
    customers,
    studioClients,
    appointments,
    testimonialReports,
  } = useApp();
  const pendingApprovals = getPendingMarketplaceApprovals().length;
  const pendingUnlinks = unlinkRequests.filter(
    (r) => r.status === "pending" || r.status === "designer_review"
  ).length;
  const openReports = getOpenReportedUsersCount(userReports);
  const pendingAppointments = appointments.filter((item) => isPendingCustomerRequest(item)).length;
  const openTestimonialReports = testimonialReports.filter((item) => item.status === "open").length;

  const links = [
    {
      href: "/dashboard/admin/marketplace-approvals",
      label: "Marketplace Approvals",
      detail:
        pendingApprovals > 0
          ? `${pendingApprovals} pending designer listing${pendingApprovals === 1 ? "" : "s"}`
          : "Queue clear",
      icon: ClipboardCheck,
      badge: pendingApprovals,
    },
    {
      href: "/dashboard/admin/projects",
      label: "Projects",
      detail:
        projects.length > 0
          ? `${projects.length} commission${projects.length === 1 ? "" : "s"} on platform`
          : "No projects yet",
      icon: FolderKanban,
    },
    {
      href: "/dashboard/admin/appointments",
      label: "Appointments",
      detail:
        appointments.length > 0
          ? `${appointments.length} scheduled${pendingAppointments > 0 ? ` · ${pendingAppointments} pending` : ""}`
          : "No appointments yet",
      icon: Calendar,
      badge: pendingAppointments,
    },
    {
      href: "/dashboard/admin/studio-clients",
      label: "Studio clients",
      detail:
        studioClients.length > 0
          ? `${studioClients.length} walk-in client${studioClients.length === 1 ? "" : "s"}`
          : "No studio clients yet",
      icon: Contact,
    },
    {
      href: "/dashboard/admin/testimonials",
      label: "Testimonials",
      detail:
        openTestimonialReports > 0
          ? `${openTestimonialReports} reported review${openTestimonialReports === 1 ? "" : "s"} to review`
          : "Moderate client reviews",
      icon: MessageSquare,
      badge: openTestimonialReports,
    },
    {
      href: "/dashboard/admin/relationships",
      label: "Relationships",
      detail: "Designer–client links across the platform",
      icon: Link2,
    },
    {
      href: "/dashboard/admin/reported-users",
      label: "Reported Users",
      detail:
        openReports > 0
          ? `${openReports} open moderation case${openReports === 1 ? "" : "s"}`
          : "No open reports",
      icon: Flag,
      badge: openReports,
    },
    {
      href: "/dashboard/admin/unlink-requests",
      label: "Unlink Requests",
      detail:
        pendingUnlinks > 0
          ? `${pendingUnlinks} open request${pendingUnlinks === 1 ? "" : "s"}`
          : "No open requests",
      icon: Link2Off,
      badge: pendingUnlinks,
    },
    {
      href: "/dashboard/admin/designers",
      label: "Designers",
      detail:
        designers.length > 0
          ? `${designers.length} registered designer${designers.length === 1 ? "" : "s"}`
          : "No designers yet",
      icon: PenTool,
    },
    {
      href: "/dashboard/admin/customers",
      label: "Clients",
      detail:
        customers.length > 0
          ? `${customers.length} registered client${customers.length === 1 ? "" : "s"}`
          : "No clients yet",
      icon: Users,
    },
    {
      href: "/dashboard/admin/team",
      label: "Admin team",
      detail: "Grant portal access to employees",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="rounded-xl bg-surface-container p-6 shadow-sm">
      <h2 className="font-headline text-lg font-semibold text-primary">Quick access</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-start gap-4 rounded-xl border border-primary/8 bg-card p-5 shadow-sm transition-colors hover:border-accent/30 hover:bg-surface"
          >
            <span className="rounded-lg bg-accent/15 p-2 text-accent">
              <link.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium text-primary">{link.label}</span>
                <span className="flex items-center gap-2">
                  {link.badge ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-brand-dark">
                      {link.badge}
                    </span>
                  ) : null}
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary/30 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </span>
              </span>
              <span className="mt-1 block text-sm text-primary/55">{link.detail}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
