"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Activity,
  ClipboardCheck,
  Flag,
  FolderKanban,
  Link2,
  Link2Off,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { buildAdminActivityFeed, formatAdminActivityTime, type AdminActivityType } from "@/lib/admin-activity";
import { useAdminRelationships } from "@/hooks/useAdminRelationships";
import type { DateRangeFilter } from "@/lib/admin-date-filter";
import { isDateInRange } from "@/lib/admin-date-filter";

const typeIcons: Record<AdminActivityType, typeof Activity> = {
  project: FolderKanban,
  marketplace: ClipboardCheck,
  unlink: Link2Off,
  report: Flag,
  relationship: Link2,
};

const typeLabels: Record<AdminActivityType, string> = {
  project: "Project",
  marketplace: "Marketplace",
  unlink: "Unlink",
  report: "Report",
  relationship: "Relationship",
};

export function AdminActivityFeed({
  limit = 12,
  dateRange,
}: {
  limit?: number;
  dateRange?: DateRangeFilter;
}) {
  const {
    projects,
    marketplaceApprovals,
    unlinkRequests,
    userReports,
  } = useApp();
  const { relationships } = useAdminRelationships();

  const items = useMemo(() => {
    const feed = buildAdminActivityFeed({
      projects,
      marketplaceApprovals,
      unlinkRequests,
      userReports,
      relationships: relationships.slice(0, 10),
      limit: dateRange && dateRange.preset !== "all" ? 500 : limit,
    });
    const scoped =
      dateRange && dateRange.preset !== "all"
        ? feed.filter((item) => isDateInRange(item.timestamp, dateRange))
        : feed;
    return scoped.slice(0, limit);
  }, [
    projects,
    marketplaceApprovals,
    unlinkRequests,
    userReports,
    relationships,
    limit,
    dateRange,
  ]);

  return (
    <section className="rounded-xl bg-surface-container p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent" />
          <h2 className="font-headline text-lg font-semibold text-primary">Recent activity</h2>
        </div>
        <Link href="/dashboard/admin/projects" className="text-xs font-medium text-accent hover:underline">
          View all projects
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-primary/50">No recent platform activity yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const Icon = typeIcons[item.type];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-start gap-4 rounded-lg border border-primary/6 bg-card/40 px-4 py-4 transition-colors hover:border-primary/12 hover:bg-card"
                >
                  <span className="mt-0.5 shrink-0 rounded-lg bg-accent/10 p-2 text-accent">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium text-primary">{item.title}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/40">
                        {typeLabels[item.type]}
                      </span>
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed text-primary/55">
                      {item.summary}
                    </span>
                  </span>
                  <span className="shrink-0 pt-0.5 text-xs text-primary/40">
                    {formatAdminActivityTime(item.timestamp)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
