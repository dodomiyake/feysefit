"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { AdminDateRangeFilter } from "@/components/admin/AdminDateRangeFilter";
import { AdminExportButton } from "@/components/admin/AdminExportButton";
import { AdminFilterToolbar } from "@/components/admin/AdminFilterToolbar";
import { AdminSearchField } from "@/components/admin/AdminSearchField";
import type { DateRangeFilter } from "@/lib/admin-date-filter";
import { isDateInRange } from "@/lib/admin-date-filter";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { ListPagination } from "@/components/ui/ListPagination";
import { useListPagination } from "@/hooks/useListPagination";

const defaultDateRange: DateRangeFilter = { preset: "all" };

export function AdminDesignersTable() {
  const { designers, isDesignerMarketplaceLive } = useApp();
  const [query, setQuery] = useState("");
  const [marketplaceFilter, setMarketplaceFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>(defaultDateRange);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return designers.filter((designer) => {
      const live = isDesignerMarketplaceLive(designer.id);
      if (marketplaceFilter === "live" && !live) return false;
      if (marketplaceFilter === "hidden" && live) return false;
      if (!isDateInRange(designer.createdAt, dateRange)) return false;
      if (!normalized) return true;
      const haystack =
        `${designer.businessName} ${designer.designerName} ${designer.location} ${designer.specialty}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [designers, query, marketplaceFilter, dateRange, isDesignerMarketplaceLive]);

  const resetKey = `${query}|${marketplaceFilter}|${dateRange.preset}|${dateRange.from ?? ""}|${dateRange.to ?? ""}`;
  const { items, page, totalPages, totalItems, rangeStart, rangeEnd, setPage } = useListPagination(
    filtered,
    20,
    resetKey
  );

  const exportColumns = [
    { header: "Business", value: (row: (typeof filtered)[number]) => row.businessName },
    { header: "Designer", value: (row: (typeof filtered)[number]) => row.designerName },
    { header: "Location", value: (row: (typeof filtered)[number]) => row.location },
    { header: "Specialty", value: (row: (typeof filtered)[number]) => row.specialty },
    {
      header: "Marketplace",
      value: (row: (typeof filtered)[number]) =>
        isDesignerMarketplaceLive(row.id) ? "Live" : "Not listed",
    },
    { header: "Joined", value: (row: (typeof filtered)[number]) => row.createdAt ?? "" },
  ];

  if (designers.length === 0) {
    return (
      <Card padding="md">
        <p className="text-sm text-primary/60">No designers registered yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AdminFilterToolbar
        exportButton={
          <AdminExportButton
            filename={`feysefit-designers-${new Date().toISOString().slice(0, 10)}`}
            columns={exportColumns}
            rows={filtered}
          />
        }
      >
        <div className="md:col-span-2 xl:col-span-1">
          <AdminSearchField
            id="designer-search"
            value={query}
            onChange={setQuery}
            placeholder="Search business, specialty…"
          />
        </div>
        <Select
          label="Marketplace"
          options={[
            { value: "all", label: "All designers" },
            { value: "live", label: "Live on marketplace" },
            { value: "hidden", label: "Not listed" },
          ]}
          value={marketplaceFilter}
          onChange={(event) => setMarketplaceFilter(event.target.value)}
        />
        <AdminDateRangeFilter value={dateRange} onChange={setDateRange} label="Joined" />
      </AdminFilterToolbar>

      <div className="overflow-x-auto rounded-xl bg-card shadow-sm">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-primary/50">No designers match your filters.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/10 text-left text-xs uppercase tracking-wider text-primary/50">
                <th className="p-4">Business</th>
                <th className="hidden p-4 sm:table-cell">Location</th>
                <th className="hidden p-4 md:table-cell">Specialty</th>
                <th className="p-4">Marketplace</th>
                <th className="hidden p-4 lg:table-cell">Joined</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-b border-primary/5 last:border-0">
                  <td className="p-4 font-medium">
                    <Link href={`/dashboard/admin/designers/${d.id}`} className="hover:text-accent hover:underline">
                      {d.businessName}
                    </Link>
                  </td>
                  <td className="hidden p-4 text-primary/60 sm:table-cell">{d.location || "—"}</td>
                  <td className="hidden p-4 md:table-cell">
                    <Badge>{d.specialty || "—"}</Badge>
                  </td>
                  <td className="p-4">
                    <Badge variant={isDesignerMarketplaceLive(d.id) ? "gold" : "outline"}>
                      {isDesignerMarketplaceLive(d.id) ? "Live" : "Not listed"}
                    </Badge>
                  </td>
                  <td className="hidden p-4 text-primary/50 lg:table-cell">
                    {d.createdAt
                      ? new Date(d.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/dashboard/admin/designers/${d.id}`}
                      className="inline-flex rounded-full px-4 py-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ListPagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onPageChange={setPage}
      />
    </div>
  );
}
