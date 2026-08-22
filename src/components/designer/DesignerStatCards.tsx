"use client";

import { useMemo } from "react";
import { Users, FolderKanban, Ruler, ShoppingCart } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { isActiveCommission, isProjectCompleted } from "@/lib/project-delivery";
import { cn } from "@/lib/cn";

export function DesignerStatCards() {
  const { customers, projects } = useApp();

  const stats = useMemo(() => {
    const activeProjects = projects.filter((p) => isActiveCommission(p.status));
    const pendingMeasurements = activeProjects.filter((p) => p.status === "Measurements Needed");
    const completedOrders = projects.filter((p) => isProjectCompleted(p.status));

    return [
      {
        label: "Total Clients",
        value: String(customers.length),
        icon: Users,
        iconColor: "text-accent",
        alert: false,
      },
      {
        label: "Active Projects",
        value: String(activeProjects.length),
        icon: FolderKanban,
        iconColor: "text-accent",
        alert: false,
      },
      {
        label: "Pending Measurements",
        value: String(pendingMeasurements.length),
        icon: Ruler,
        iconColor: "text-red-500",
        alert: pendingMeasurements.length > 0,
      },
      {
        label: "Completed Orders",
        value: String(completedOrders.length),
        icon: ShoppingCart,
        iconColor: "text-accent",
        alert: false,
      },
    ];
  }, [customers.length, projects]);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-primary/8 bg-card p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1"
        >
          <div className="mb-4 flex items-start justify-between">
            <span className={cn("rounded-lg bg-surface p-2", stat.iconColor)}>
              <stat.icon className="h-5 w-5" />
            </span>
            {stat.alert && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            )}
          </div>
          <p className="text-sm font-medium text-primary/60">{stat.label}</p>
          <p className="mt-1 font-headline text-2xl font-semibold text-primary">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
