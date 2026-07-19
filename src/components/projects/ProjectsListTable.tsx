"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ListPagination } from "@/components/ui/ListPagination";
import { StatusPill } from "@/components/ui/StatusPill";
import { useListPagination } from "@/hooks/useListPagination";
import { projectStatuses } from "@/lib/design-tokens";
import type { Project } from "@/lib/mock-data";

export function ProjectsListTable() {
  const { projects } = useApp();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (statusFilter !== "all" && project.status !== statusFilter) return false;
      if (!normalized) return true;
      const haystack =
        `${project.title} ${project.projectCode} ${project.customerName} ${project.outfitType} ${project.budget} ${project.deadline}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [projects, query, statusFilter]);

  const resetKey = `${query}|${statusFilter}`;
  const { items, page, totalPages, totalItems, rangeStart, rangeEnd, setPage } = useListPagination(
    filtered,
    20,
    resetKey
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-md flex-1 items-center gap-3 rounded-lg border border-primary/10 bg-card px-4 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-primary/40" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search project, client, code…"
            className="w-full bg-transparent text-sm text-primary placeholder:text-primary/40 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-primary/10 bg-card px-4 py-2.5 text-sm text-primary"
        >
          <option value="all">All statuses</option>
          {projectStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-primary/10 bg-card shadow-sm">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-primary/50">No projects match your filters.</p>
        ) : (
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[22%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr className="border-b border-primary/10 text-left text-xs uppercase tracking-wider text-primary/50">
                <th className="p-3 font-semibold">Project</th>
                <th className="hidden p-3 font-semibold sm:table-cell">Client</th>
                <th className="hidden p-3 font-semibold md:table-cell">Type</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="hidden p-3 font-semibold lg:table-cell">Deadline</th>
                <th className="hidden p-3 font-semibold xl:table-cell">Budget</th>
                <th className="p-3" aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {items.map((project: Project) => (
                <tr
                  key={project.id}
                  className="border-b border-primary/5 last:border-0 hover:bg-surface/60"
                >
                  <td className="p-3 align-middle">
                    <Link href={`/projects/${project.id}`} className="group block min-w-0">
                      <p className="break-words font-medium leading-snug text-accent group-hover:underline">
                        {project.title}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-primary/40">{project.projectCode}</p>
                    </Link>
                  </td>
                  <td className="hidden p-3 align-middle text-primary/70 sm:table-cell">
                    {project.customerName}
                  </td>
                  <td className="hidden p-3 align-middle text-primary/60 md:table-cell">
                    {project.outfitType}
                  </td>
                  <td className="min-w-0 p-3 align-middle">
                    <StatusPill status={project.status} compact />
                  </td>
                  <td className="hidden p-3 align-middle text-primary/60 lg:table-cell">
                    {project.deadline || "—"}
                  </td>
                  <td className="hidden p-3 align-middle font-medium text-accent xl:table-cell">
                    {project.budget || "—"}
                  </td>
                  <td className="p-3 align-middle">
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex rounded-full p-1.5 text-primary/40 transition-colors hover:bg-primary/5 hover:text-accent"
                      aria-label={`Open ${project.title}`}
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
