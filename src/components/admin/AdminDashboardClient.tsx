"use client";

import { useMemo, useState } from "react";
import { Calendar, Download } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useReauth } from "@/context/ReauthContext";
import { AdminActivityFeed } from "@/components/admin/AdminActivityFeed";
import { AdminMarketplaceApprovals } from "@/components/admin/AdminMarketplaceApprovals";
import { AdminOverviewLinks } from "@/components/admin/AdminOverviewLinks";
import { AdminProjectsTable } from "@/components/admin/AdminProjectsTable";
import { AdminStudioClientsTable } from "@/components/admin/AdminStudioClientsTable";
import { AdminAppointmentsTable } from "@/components/admin/AdminAppointmentsTable";
import { AdminStatCards } from "@/components/admin/AdminStatCards";
import { AdminDateRangeFilter } from "@/components/admin/AdminDateRangeFilter";
import { Button } from "@/components/ui/Button";
import { buildAdminActivityFeed } from "@/lib/admin-activity";
import type { DateRangeFilter } from "@/lib/admin-date-filter";
import { formatDateRangeLabel, isDateInRange } from "@/lib/admin-date-filter";
import { getOpenReportedUsersCount } from "@/lib/admin-reports";
import { isPendingCustomerRequest } from "@/lib/local-customer";
import { exportCsv } from "@/lib/csv-export";

const defaultDateRange: DateRangeFilter = { preset: "30d" };

export function AdminDashboardClient() {
  const { designers, customers, projects, marketplaceApprovals, unlinkRequests, userReports, studioClients, appointments } =
    useApp();
  const { ensureReauth } = useReauth();
  const [dateRange, setDateRange] = useState<DateRangeFilter>(defaultDateRange);
  const [showDateFilter, setShowDateFilter] = useState(false);

  const activityItems = useMemo(
    () =>
      buildAdminActivityFeed({
        projects,
        marketplaceApprovals,
        unlinkRequests,
        userReports,
        limit: 500,
      }).filter((item) => isDateInRange(item.timestamp, dateRange)),
    [projects, marketplaceApprovals, unlinkRequests, userReports, dateRange]
  );

  async function handleExport() {
    const ok = await ensureReauth({ purpose: "download several customer records" });
    if (!ok) return;

    exportCsv(`feysefit-admin-summary-${new Date().toISOString().slice(0, 10)}`, [
      { header: "Metric", value: (row) => row.metric },
      { header: "Value", value: (row) => row.value },
    ], [
      { metric: "Period", value: formatDateRangeLabel(dateRange) },
      { metric: "Designers", value: designers.length },
      { metric: "Clients", value: customers.length },
      { metric: "Projects", value: projects.length },
      { metric: "Studio clients", value: studioClients.length },
      { metric: "Appointments", value: appointments.length },
      { metric: "Pending appointment requests", value: appointments.filter((item) => isPendingCustomerRequest(item)).length },
      { metric: "Open reports", value: getOpenReportedUsersCount(userReports) },
      { metric: "Activity items in period", value: activityItems.length },
    ]);

    exportCsv(`feysefit-admin-activity-${new Date().toISOString().slice(0, 10)}`, [
      { header: "Type", value: (row) => row.type },
      { header: "Title", value: (row) => row.title },
      { header: "Summary", value: (row) => row.summary },
      { header: "When", value: (row) => row.timestamp.toISOString() },
    ], activityItems);
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-headline text-2xl font-bold text-primary lg:text-3xl">
            Executive Overview
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary/60 lg:text-base">
            Welcome back. Here is what is happening across FeyseFit today.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => setShowDateFilter((current) => !current)}
            >
              <Calendar className="h-4 w-4" />
              {formatDateRangeLabel(dateRange)}
            </Button>
            <Button
              type="button"
              variant="zinc"
              size="sm"
              className="gap-2"
              onClick={() => void handleExport()}
            >
              <Download className="h-4 w-4" />
              Export report
            </Button>
          </div>
          {showDateFilter && (
            <div className="w-full sm:w-72">
              <AdminDateRangeFilter value={dateRange} onChange={setDateRange} />
            </div>
          )}
        </div>
      </div>

      <AdminStatCards />

      <div className="mt-8">
        <AdminActivityFeed dateRange={dateRange} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <AdminMarketplaceApprovals variant="compact" />
        </div>
        <div className="lg:col-span-7">
          <AdminOverviewLinks />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
        <AdminAppointmentsTable limit={5} showFilters={false} />
        <AdminStudioClientsTable limit={5} showFilters={false} />
      </div>

      <div className="mt-8">
        <AdminProjectsTable limit={5} />
      </div>
    </>
  );
}
