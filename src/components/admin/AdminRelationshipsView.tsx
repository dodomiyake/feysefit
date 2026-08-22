"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { AdminDateRangeFilter } from "@/components/admin/AdminDateRangeFilter";
import { AdminExportButton } from "@/components/admin/AdminExportButton";
import { AdminFilterToolbar } from "@/components/admin/AdminFilterToolbar";
import { AdminSearchField } from "@/components/admin/AdminSearchField";
import type { AdminRelationship } from "@/lib/admin-relationships";
import { isActiveAdminRelationshipRow } from "@/lib/admin-relationships";
import type { DateRangeFilter } from "@/lib/admin-date-filter";
import { isDateInRange } from "@/lib/admin-date-filter";
import { useAdminRelationships } from "@/hooks/useAdminRelationships";

type ActiveFilter = "all" | "active" | "inactive";
type RegistrationFilter = "all" | "invited" | "direct";

const defaultDateRange: DateRangeFilter = { preset: "all" };

function getRelationshipStatusLabel(row: AdminRelationship) {
  if (row.awaitingDesigner) return "Awaiting designer";
  if (row.isActive) return "Active";
  return "Ended / unlinked";
}

export function AdminRelationshipsView() {
  const { relationships, loading, error } = useAdminRelationships();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");
  const [registrationFilter, setRegistrationFilter] = useState<RegistrationFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>(defaultDateRange);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return relationships.filter((row) => {
      if (activeFilter === "active" && !isActiveAdminRelationshipRow(row)) return false;
      if (activeFilter === "inactive" && (row.awaitingDesigner || row.isActive)) return false;
      if (registrationFilter !== "all" && row.registrationType !== registrationFilter) return false;
      if (!isDateInRange(row.createdAt, dateRange)) return false;
      if (!normalized) return true;
      const haystack =
        `${row.designerName} ${row.customerName} ${row.registrationType} ${getRelationshipStatusLabel(row)}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [relationships, query, activeFilter, registrationFilter, dateRange]);

  const exportColumns = [
    { header: "Designer", value: (row: AdminRelationship) => row.designerName },
    { header: "Client", value: (row: AdminRelationship) => row.customerName },
    { header: "Registration", value: (row: AdminRelationship) => row.registrationType },
    {
      header: "Status",
      value: (row: AdminRelationship) => getRelationshipStatusLabel(row),
    },
    { header: "Projects", value: (row: AdminRelationship) => row.projectCount },
    { header: "Linked", value: (row: AdminRelationship) => row.createdAt },
  ];

  if (loading) {
    return <Card padding="md"><p className="text-sm text-primary/60">Loading relationships…</p></Card>;
  }

  if (error) {
    return <Card padding="md"><p className="text-sm text-red-600">{error}</p></Card>;
  }

  return (
    <div className="space-y-6">
      <AdminFilterToolbar
        exportButton={
          <AdminExportButton
            filename={`feysefit-relationships-${new Date().toISOString().slice(0, 10)}`}
            columns={exportColumns}
            rows={filtered}
          />
        }
      >
        <div className="md:col-span-2 xl:col-span-1">
          <AdminSearchField
            id="relationship-search"
            value={query}
            onChange={setQuery}
            placeholder="Search designer or client…"
          />
        </div>
        <Select
          label="Link status"
          options={[
            { value: "active", label: "Current links" },
            { value: "inactive", label: "Ended / unlinked" },
            { value: "all", label: "All history" },
          ]}
          value={activeFilter}
          onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)}
        />
        <Select
          label="Registration"
          options={[
            { value: "all", label: "All types" },
            { value: "invited", label: "Invited" },
            { value: "direct", label: "Direct signup" },
          ]}
          value={registrationFilter}
          onChange={(event) => setRegistrationFilter(event.target.value as RegistrationFilter)}
        />
        <AdminDateRangeFilter value={dateRange} onChange={setDateRange} label="Linked" />
      </AdminFilterToolbar>

      <div className="overflow-x-auto rounded-xl bg-card shadow-sm">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-primary/50">No relationships match your filters.</p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-primary/10 text-left text-xs uppercase tracking-wider text-primary/50">
                <th className="p-4">Designer</th>
                <th className="p-4">Client</th>
                <th className="p-4">Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Projects</th>
                <th className="hidden p-4 lg:table-cell">Linked</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-primary/5 last:border-0">
                  <td className="p-4">
                    {row.awaitingDesigner || !row.designerId ? (
                      <span className="text-primary/50">{row.designerName}</span>
                    ) : (
                      <Link
                        href={`/dashboard/admin/designers/${row.designerId}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {row.designerName}
                      </Link>
                    )}
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/dashboard/admin/customers/${row.customerId}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {row.customerName}
                    </Link>
                  </td>
                  <td className="p-4 capitalize text-primary/70">{row.registrationType}</td>
                  <td className="p-4">
                    <Badge variant={row.awaitingDesigner || row.isActive ? "gold" : "outline"}>
                      {getRelationshipStatusLabel(row)}
                    </Badge>
                  </td>
                  <td className="p-4 text-primary/70">{row.projectCount}</td>
                  <td className="hidden p-4 text-primary/50 lg:table-cell">
                    {new Date(row.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-primary/45">
        Showing {filtered.length} of {relationships.length} relationship records. Ended links are kept only as history.
      </p>
    </div>
  );
}
