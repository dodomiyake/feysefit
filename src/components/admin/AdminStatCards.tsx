"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Users, FolderKanban, Scissors, AlertTriangle, Calendar, Contact } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getOpenReportedUsersCount } from "@/lib/admin-reports";
import { isPendingCustomerRequest } from "@/lib/local-customer";
import { cn } from "@/lib/cn";

export function AdminStatCards() {
  const { designers, customers, projects, userReports, studioClients, appointments } = useApp();

  const stats = useMemo(() => {
    const openReports = getOpenReportedUsersCount(userReports);
    const pendingAppointments = appointments.filter((item) => isPendingCustomerRequest(item)).length;

    return [
      {
        label: "Total Designers",
        value: String(designers.length),
        icon: Scissors,
        urgent: false,
        href: "/dashboard/admin/designers",
      },
      {
        label: "Total Clients",
        value: String(customers.length),
        icon: Users,
        urgent: false,
        href: "/dashboard/admin/customers",
      },
      {
        label: "Total Projects",
        value: String(projects.length),
        icon: FolderKanban,
        urgent: false,
        href: "/dashboard/admin/projects",
      },
      {
        label: "Studio Clients",
        value: String(studioClients.length),
        icon: Contact,
        urgent: false,
        href: "/dashboard/admin/studio-clients",
      },
      {
        label: "Appointments",
        value: String(appointments.length),
        icon: Calendar,
        urgent: pendingAppointments > 0,
        href: "/dashboard/admin/appointments",
      },
      {
        label: "Pending Reports",
        value: String(openReports),
        icon: AlertTriangle,
        urgent: openReports > 0,
        href: "/dashboard/admin/reported-users",
      },
    ];
  }, [
    designers.length,
    customers.length,
    projects.length,
    studioClients.length,
    appointments,
    userReports,
  ]);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
      {stats.map((stat) => (
        <Link
          key={stat.label}
          href={stat.href}
          className={cn(
            "block rounded-xl border border-primary/8 bg-card p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
            stat.urgent && "border-red-200/60"
          )}
        >
          <div className="mb-4 flex items-start justify-between">
            <span
              className={cn(
                "rounded-lg bg-surface p-2",
                stat.urgent ? "text-red-500" : "text-accent"
              )}
            >
              <stat.icon className="h-5 w-5" />
            </span>
            {stat.urgent && (
              <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600">
                Urgent
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-primary/60">{stat.label}</p>
          <p className="mt-1 font-headline text-2xl font-semibold text-primary">{stat.value}</p>
        </Link>
      ))}
    </div>
  );
}
