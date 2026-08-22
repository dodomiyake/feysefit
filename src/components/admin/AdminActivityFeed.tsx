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
  limit = 5,
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
    <section className="rounded-xl bg-surface-container p-4 shadow-sm lg:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <div>
            <h2 className="font-headline text-base font-semibold text-primary">Recent activity</h2>
            <p className="mt-0.5 text-xs text-primary/45">
              Latest platform events only. Export the report for the full audit trail.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-primary/10 bg-background px-3 py-1 text-[11px] font-semibold text-primary/55">
          Latest {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-primary/6 bg-card/40 px-3 py-3 text-sm text-primary/50">
          No recent platform activity yet.
        </p>
      ) : (
        <ul className="divide-y divide-primary/6 overflow-hidden rounded-lg border border-primary/6 bg-card/40">
          {items.map((item) => {
            const Icon = typeIcons[item.type];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-card"
                >
                  <span className="shrink-0 rounded-md bg-accent/10 p-1.5 text-accent">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate text-sm font-medium text-primary">{item.title}</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-primary/35">
                        {typeLabels[item.type]}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-primary/50">
                      {item.summary}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-primary/35">
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
