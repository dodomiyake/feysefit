"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { Customer } from "@/lib/mock-data";
import type { StudioClient } from "@/lib/studio-client";
import { customerMessageThreadHref } from "@/lib/message-links";
import { customerProjectsHref } from "@/lib/customer-display";
import { ListPagination } from "@/components/ui/ListPagination";
import { useListPagination } from "@/hooks/useListPagination";

interface ClientsCompactListProps {
  tab: "app" | "studio";
  appClients: Customer[];
  studioClients: StudioClient[];
  resetKey: string;
}

export function ClientsCompactList({
  tab,
  appClients,
  studioClients,
  resetKey,
}: ClientsCompactListProps) {
  const { projects } = useApp();
  const items: Array<Customer | StudioClient> = tab === "app" ? appClients : studioClients;
  const { items: pageItems, page, totalPages, totalItems, rangeStart, rangeEnd, setPage } =
    useListPagination(items, 20, resetKey);

  if (pageItems.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="w-full overflow-x-auto rounded-xl border border-primary/10 bg-card shadow-sm">
        {tab === "app" ? (
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[18%]" />
              <col className="w-[28%]" />
              <col className="w-[10%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-primary/10 text-left text-xs uppercase tracking-wider text-primary/50">
                <th className="p-3 font-semibold">Client</th>
                <th className="hidden p-3 font-semibold sm:table-cell">Location</th>
                <th className="hidden p-3 font-semibold md:table-cell">Contact</th>
                <th className="p-3 font-semibold">Projects</th>
                <th className="p-3 w-28 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((customer) => {
                const row = customer as Customer;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-primary/5 last:border-0 hover:bg-surface/60"
                  >
                    <td className="p-3 align-top">
                      <Link
                        href={`/clients/${row.id}`}
                        className="break-words font-medium leading-snug text-accent hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="hidden break-words p-3 text-primary/65 sm:table-cell">
                      {row.location || "—"}
                    </td>
                    <td className="hidden p-3 text-primary/60 md:table-cell">
                      <p>{row.phone || "—"}</p>
                      <p className="text-xs">{row.email || "—"}</p>
                    </td>
                    <td className="p-3 text-primary/70">{row.projectCount}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={customerProjectsHref(row.id, projects)}
                          className="rounded-full px-2 py-1 text-xs font-medium text-primary/70 hover:bg-primary/5 hover:text-accent"
                        >
                          Projects
                        </Link>
                        <Link
                          href={customerMessageThreadHref(row.id, projects)}
                          className="inline-flex rounded-full p-1.5 text-primary/40 hover:bg-primary/5 hover:text-accent"
                          aria-label={`Message ${row.name}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[20%]" />
              <col className="w-[30%]" />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr className="border-b border-primary/10 text-left text-xs uppercase tracking-wider text-primary/50">
                <th className="p-3 font-semibold">Client</th>
                <th className="hidden p-3 font-semibold sm:table-cell">Location</th>
                <th className="hidden p-3 font-semibold md:table-cell">Contact</th>
                <th className="p-3 w-10" aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((client) => {
                const row = client as StudioClient;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-primary/5 last:border-0 hover:bg-surface/60"
                  >
                    <td className="p-3">
                      <Link
                        href={`/clients/studio/${row.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="hidden p-3 text-primary/65 sm:table-cell">
                      {row.location || "—"}
                    </td>
                    <td className="hidden p-3 text-primary/60 md:table-cell">
                      <p>{row.phone || "—"}</p>
                      <p className="text-xs">{row.email || "—"}</p>
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/clients/studio/${row.id}`}
                        className="inline-flex rounded-full p-1.5 text-primary/40 hover:bg-primary/5 hover:text-accent"
                        aria-label={`Open ${row.name}`}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
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
