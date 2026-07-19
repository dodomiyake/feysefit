"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { AdminDateRangeFilter } from "@/components/admin/AdminDateRangeFilter";
import { AdminExportButton } from "@/components/admin/AdminExportButton";
import { useApp } from "@/context/AppContext";
import { getOpenReportedUsersCount } from "@/lib/admin-reports";
import type { UserReport } from "@/lib/admin-reports";
import type { DateRangeFilter } from "@/lib/admin-date-filter";
import { isDateInRange } from "@/lib/admin-date-filter";

type ReportAction = "dismiss" | "suspend" | "ban";
type StatusFilter = "open" | "all" | "dismissed" | "resolved";

const defaultDateRange: DateRangeFilter = { preset: "all" };

export function AdminReportedUsers() {
  const {
    userReports,
    adminDismissReport,
    adminSuspendReportedUser,
    adminBanReportedUser,
    showToast,
  } = useApp();
  const [pending, setPending] = useState<{ reportId: string; action: ReportAction } | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [dateRange, setDateRange] = useState<DateRangeFilter>(defaultDateRange);

  const filtered = useMemo(() => {
    return userReports.filter((report) => {
      if (statusFilter !== "all" && report.status !== statusFilter) return false;
      if (!isDateInRange(report.createdAt, dateRange)) return false;
      return true;
    });
  }, [userReports, statusFilter, dateRange]);

  const openCount = getOpenReportedUsersCount(userReports);

  const exportColumns = [
    { header: "Handle", value: (row: UserReport) => row.handle },
    { header: "Name", value: (row: UserReport) => row.name ?? "" },
    { header: "Priority", value: (row: UserReport) => row.priority },
    { header: "Reason", value: (row: UserReport) => row.reason },
    { header: "Detail", value: (row: UserReport) => row.detail },
    { header: "Status", value: (row: UserReport) => row.status },
    { header: "Reported", value: (row: UserReport) => row.createdAt ?? "" },
  ];

  async function runAction(reportId: string, action: ReportAction) {
    setPending({ reportId, action });
    try {
      if (action === "dismiss") {
        await adminDismissReport(reportId);
        return;
      }
      if (action === "suspend") {
        const confirmed = window.confirm(
          "Suspend this account? The user will be signed out and blocked from signing in again until an admin restores access."
        );
        if (!confirmed) return;
        await adminSuspendReportedUser(reportId);
        return;
      }
      const confirmed = window.confirm(
        "Permanently ban this account? The user will lose access and their marketplace listing will be removed."
      );
      if (!confirmed) return;
      await adminBanReportedUser(reportId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Action failed", "error");
    } finally {
      setPending(null);
    }
  }

  function isPending(reportId: string, action: ReportAction) {
    return pending?.reportId === reportId && pending.action === action;
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-headline text-lg font-semibold text-primary">
          Reported Users ({openCount} open)
        </h2>
        <AdminExportButton
          filename={`feysefit-reports-${new Date().toISOString().slice(0, 10)}`}
          columns={exportColumns}
          rows={filtered}
        />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Select
          label="Status"
          options={[
            { value: "open", label: "Open only" },
            { value: "all", label: "All reports" },
            { value: "dismissed", label: "Dismissed" },
            { value: "resolved", label: "Resolved" },
          ]}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
        />
        <AdminDateRangeFilter value={dateRange} onChange={setDateRange} label="Reported" />
      </div>

      {filtered.length === 0 ? (
        <Card padding="md">
          <p className="text-sm text-primary/60">No reports match your filters.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((report) => (
            <Card key={report.id} padding="md" className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-primary">
                    {report.adminProfileHref ? (
                      <Link href={report.adminProfileHref} className="text-accent hover:underline">
                        {report.handle}
                      </Link>
                    ) : (
                      report.handle
                    )}
                    {report.name && (
                      <span className="font-normal text-primary/60"> ({report.name})</span>
                    )}
                  </h3>
                  <p className="mt-2 text-sm text-primary/70">
                    Reported for: &ldquo;{report.reason}&rdquo;
                  </p>
                  {report.detail ? (
                    <p className="mt-1 text-xs text-primary/45">{report.detail}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-primary/40">
                    Status: {report.status}
                    {report.createdAt
                      ? ` · ${new Date(report.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}`
                      : ""}
                  </p>
                  {report.adminProfileHref ? (
                    <Link
                      href={report.adminProfileHref}
                      className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
                    >
                      View profile
                    </Link>
                  ) : null}
                </div>
                <Badge variant={report.variant}>{report.priority}</Badge>
              </div>
              {report.status === "open" && (
                <div className="flex flex-wrap gap-2 border-t border-primary/10 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={Boolean(pending)}
                    onClick={() => void runAction(report.id, "dismiss")}
                  >
                    {isPending(report.id, "dismiss") ? "Dismissing…" : "Dismiss"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={Boolean(pending)}
                    onClick={() => void runAction(report.id, "suspend")}
                  >
                    {isPending(report.id, "suspend") ? "Suspending…" : "Suspend"}
                  </Button>
                  <Button
                    type="button"
                    variant="zinc"
                    size="sm"
                    className="gap-1"
                    disabled={Boolean(pending)}
                    onClick={() => void runAction(report.id, "ban")}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    {isPending(report.id, "ban") ? "Banning…" : "Ban Account"}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-primary/45">
        Showing {filtered.length} of {userReports.length} reports
      </p>
    </section>
  );
}
