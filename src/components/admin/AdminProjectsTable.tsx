"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { AdminDateRangeFilter } from "@/components/admin/AdminDateRangeFilter";
import { AdminExportButton } from "@/components/admin/AdminExportButton";
import { AdminFilterExportSlot, AdminFilterToolbar } from "@/components/admin/AdminFilterToolbar";
import { AdminSearchField } from "@/components/admin/AdminSearchField";
import { projectStatuses } from "@/lib/design-tokens";
import type { DateRangeFilter } from "@/lib/admin-date-filter";
import { isDateInRange } from "@/lib/admin-date-filter";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { ListPagination } from "@/components/ui/ListPagination";
import { useListPagination } from "@/hooks/useListPagination";

interface AdminProjectsTableProps {
  limit?: number | null;
  showFilters?: boolean;
}

const defaultDateRange: DateRangeFilter = { preset: "all" };

export function AdminProjectsTable({ limit = 3, showFilters = false }: AdminProjectsTableProps) {
  const { projects, designers } = useApp();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [designerFilter, setDesignerFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>(defaultDateRange);

  const designerOptions = useMemo(
    () => [
      { value: "all", label: "All designers" },
      ...designers.map((designer) => ({
        value: designer.id,
        label: designer.businessName,
      })),
    ],
    [designers]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (statusFilter !== "all" && project.status !== statusFilter) return false;
      if (designerFilter !== "all" && project.designerId !== designerFilter) return false;
      if (!isDateInRange(project.updatedAt ?? project.lastUpdated, dateRange)) return false;
      if (!normalized) return true;
      const haystack =
        `${project.title} ${project.projectCode} ${project.customerName} ${project.designerName ?? ""} ${project.outfitType}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [projects, query, statusFilter, designerFilter, dateRange]);

  const resetKey = `${query}|${statusFilter}|${designerFilter}|${dateRange.preset}|${dateRange.from ?? ""}|${dateRange.to ?? ""}`;
  const pagination = useListPagination(filtered, 20, limit === null ? resetKey : undefined);
  const rows = limit === null ? pagination.items : filtered.slice(0, limit ?? 3);

  const exportColumns = [
    { header: "Title", value: (row: (typeof filtered)[number]) => row.title },
    { header: "Code", value: (row: (typeof filtered)[number]) => row.projectCode },
    { header: "Client", value: (row: (typeof filtered)[number]) => row.customerName },
    { header: "Designer", value: (row: (typeof filtered)[number]) => row.designerName ?? "" },
    { header: "Status", value: (row: (typeof filtered)[number]) => row.status },
    { header: "Budget", value: (row: (typeof filtered)[number]) => row.budget },
    { header: "Updated", value: (row: (typeof filtered)[number]) => row.updatedAt ?? row.lastUpdated ?? "" },
  ];

  return (
    <section className="rounded-xl bg-surface-container p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-headline text-lg font-semibold text-primary">
          {limit === null ? "All Projects" : "Recent Projects"}
        </h2>
        {showFilters && (
          <div className="flex flex-wrap items-end gap-3">
            <span className="pb-2 text-xs font-medium text-accent">
              {filtered.length} of {projects.length} projects
            </span>
            <AdminFilterExportSlot>
              <AdminExportButton
                filename={`feysefit-projects-${new Date().toISOString().slice(0, 10)}`}
                columns={exportColumns}
                rows={filtered}
              />
            </AdminFilterExportSlot>
          </div>
        )}
        {!showFilters && (
          <span className="text-xs font-medium text-accent">{projects.length} projects</span>
        )}
      </div>

      {showFilters && (
        <AdminFilterToolbar className="mb-6">
          <div className="md:col-span-2 xl:col-span-1">
            <AdminSearchField
              id="project-search"
              value={query}
              onChange={setQuery}
              placeholder="Search title, code, client…"
            />
          </div>
          <Select
            label="Status"
            options={[
              { value: "all", label: "All statuses" },
              ...projectStatuses.map((status) => ({ value: status, label: status })),
            ]}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          />
          <Select
            label="Designer"
            options={designerOptions}
            value={designerFilter}
            onChange={(event) => setDesignerFilter(event.target.value)}
          />
          <AdminDateRangeFilter value={dateRange} onChange={setDateRange} label="Updated" />
        </AdminFilterToolbar>
      )}

      <div className="w-full overflow-x-auto rounded-xl bg-card">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-primary/50">No projects match your filters.</p>
        ) : (
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[16%]" />
              {showFilters && <col className="w-[16%]" />}
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr className="border-b border-primary/10 text-left text-xs uppercase tracking-wider text-primary/50">
                <th className="p-4 font-semibold">Project</th>
                <th className="p-4 font-semibold">Client</th>
                {showFilters && <th className="hidden p-4 font-semibold md:table-cell">Designer</th>}
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Budget</th>
                <th className="p-4" aria-label="View" />
              </tr>
            </thead>
            <tbody>
              {rows.map((project) => (
                <tr key={project.id} className="border-b border-primary/5 last:border-0">
                  <td className="p-4 align-top">
                    <Link
                      href={`/projects/${project.id}`}
                      className="break-words font-medium leading-snug text-accent hover:underline"
                    >
                      {project.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-primary/45">{project.projectCode}</p>
                  </td>
                  <td className="p-4 text-primary/70">{project.customerName || "—"}</td>
                  {showFilters && (
                    <td className="hidden p-4 text-primary/70 md:table-cell">
                      {project.designerId ? (
                        <Link
                          href={`/dashboard/admin/designers/${project.designerId}`}
                          className="break-words hover:text-accent hover:underline"
                        >
                          {project.designerName ?? "—"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td className="p-4">
                    <Badge variant={project.status === "Delivered" ? "gold" : "default"}>
                      {project.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-primary/70">{project.budget || "—"}</td>
                  <td className="p-4">
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex rounded-full p-1.5 text-primary/40 transition-colors hover:bg-primary/5 hover:text-accent"
                      aria-label={`View ${project.title}`}
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

      {limit !== null && filtered.length > (limit ?? 3) && (
        <div className="mt-4 text-right">
          <Link href="/dashboard/admin/projects" className="text-sm font-medium text-accent hover:underline">
            View all projects
          </Link>
        </div>
      )}

      {limit === null && (
        <ListPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          rangeStart={pagination.rangeStart}
          rangeEnd={pagination.rangeEnd}
          onPageChange={pagination.setPage}
        />
      )}
    </section>
  );
}
