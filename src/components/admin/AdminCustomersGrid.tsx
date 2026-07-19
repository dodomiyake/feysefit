"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { AdminDateRangeFilter } from "@/components/admin/AdminDateRangeFilter";
import { AdminExportButton } from "@/components/admin/AdminExportButton";
import { AdminFilterToolbar } from "@/components/admin/AdminFilterToolbar";
import { AdminSearchField } from "@/components/admin/AdminSearchField";
import { ListPagination } from "@/components/ui/ListPagination";
import { useListPagination } from "@/hooks/useListPagination";
import type { DateRangeFilter } from "@/lib/admin-date-filter";
import { isDateInRange } from "@/lib/admin-date-filter";
import { Card } from "@/components/ui/Card";

const defaultDateRange: DateRangeFilter = { preset: "all" };

export function AdminCustomersGrid() {
  const { customers } = useApp();
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeFilter>(defaultDateRange);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return customers.filter((customer) => {
      if (!isDateInRange(customer.createdAt, dateRange)) return false;
      if (!normalized) return true;
      const haystack =
        `${customer.name} ${customer.email} ${customer.phone} ${customer.location}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [customers, query, dateRange]);

  const resetKey = `${query}|${dateRange.preset}|${dateRange.from ?? ""}|${dateRange.to ?? ""}`;
  const { items, page, totalPages, totalItems, rangeStart, rangeEnd, setPage } = useListPagination(
    filtered,
    20,
    resetKey
  );

  const exportColumns = [
    { header: "Name", value: (row: (typeof filtered)[number]) => row.name },
    { header: "Email", value: (row: (typeof filtered)[number]) => row.email },
    { header: "Location", value: (row: (typeof filtered)[number]) => row.location },
    { header: "Projects", value: (row: (typeof filtered)[number]) => row.projectCount },
    { header: "Joined", value: (row: (typeof filtered)[number]) => row.createdAt ?? "" },
  ];

  if (customers.length === 0) {
    return (
      <Card padding="md">
        <p className="text-sm text-primary/60">No clients registered yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminFilterToolbar
        gridClassName="grid min-w-0 flex-1 gap-4 md:grid-cols-2"
        exportButton={
          <AdminExportButton
            filename={`feysefit-clients-${new Date().toISOString().slice(0, 10)}`}
            columns={exportColumns}
            rows={filtered}
          />
        }
      >
        <AdminSearchField
          id="customer-search"
          value={query}
          onChange={setQuery}
          placeholder="Search name, email, location…"
        />
        <AdminDateRangeFilter value={dateRange} onChange={setDateRange} label="Joined" />
      </AdminFilterToolbar>

      <div className="w-full overflow-x-auto rounded-xl border border-primary/10 bg-card shadow-sm">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-primary/50">No clients match your filters.</p>
        ) : (
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[18%]" />
              <col className="w-[28%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr className="border-b border-primary/10 text-left text-xs uppercase tracking-wider text-primary/50">
                <th className="p-3 font-semibold">Client</th>
                <th className="hidden p-3 font-semibold sm:table-cell">Location</th>
                <th className="hidden p-3 font-semibold md:table-cell">Email</th>
                <th className="p-3 font-semibold">Projects</th>
                <th className="hidden p-3 font-semibold lg:table-cell">Joined</th>
                <th className="p-3" aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {items.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-primary/5 last:border-0 hover:bg-surface/60"
                >
                  <td className="p-3 align-top">
                    <Link
                      href={`/dashboard/admin/customers/${customer.id}`}
                      className="break-words font-medium leading-snug text-accent hover:underline"
                    >
                      {customer.name}
                    </Link>
                  </td>
                  <td className="hidden break-words p-3 text-primary/65 sm:table-cell">
                    {customer.location || "—"}
                  </td>
                  <td className="hidden break-all p-3 text-primary/60 md:table-cell">
                    {customer.email || "—"}
                  </td>
                  <td className="p-3 text-primary/70">{customer.projectCount}</td>
                  <td className="hidden p-3 text-primary/50 lg:table-cell">
                    {customer.createdAt
                      ? new Date(customer.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/dashboard/admin/customers/${customer.id}`}
                      className="inline-flex rounded-full p-1.5 text-primary/40 transition-colors hover:bg-primary/5 hover:text-accent"
                      aria-label={`View ${customer.name}`}
                    >
                      <ArrowRight className="h-4 w-4" />
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
