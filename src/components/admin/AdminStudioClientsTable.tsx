"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { AdminExportButton } from "@/components/admin/AdminExportButton";
import { AdminFilterExportSlot, AdminFilterToolbar } from "@/components/admin/AdminFilterToolbar";
import { AdminSearchField } from "@/components/admin/AdminSearchField";
import { Select } from "@/components/ui/Select";
import type { StudioClient } from "@/lib/studio-client";
import { countStudioClientMeasurements } from "@/lib/studio-client";
import { matchesAdminDesignerFilter } from "@/lib/admin-designer-filter";

interface AdminStudioClientsTableProps {
  limit?: number | null;
  showFilters?: boolean;
  designerId?: string;
}

export function AdminStudioClientsTable({
  limit = null,
  showFilters = true,
  designerId,
}: AdminStudioClientsTableProps = {}) {
  const { studioClients, designers } = useApp();
  const [query, setQuery] = useState("");
  const [designerFilter, setDesignerFilter] = useState("all");

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
    return studioClients.filter((client) => {
      if (designerId && !matchesAdminDesignerFilter(client, designerId, designers)) return false;
      if (designerFilter !== "all" && !matchesAdminDesignerFilter(client, designerFilter, designers)) {
        return false;
      }
      if (!normalized) return true;
      const haystack =
        `${client.name} ${client.phone} ${client.email} ${client.location} ${client.designerName ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [studioClients, query, designerFilter, designerId, designers]);

  const rows = limit === null ? filtered : filtered.slice(0, limit ?? 5);

  const exportColumns = [
    { header: "Client", value: (row: StudioClient) => row.name },
    { header: "Designer", value: (row: StudioClient) => row.designerName ?? "" },
    { header: "Phone", value: (row: StudioClient) => row.phone },
    { header: "Email", value: (row: StudioClient) => row.email },
    { header: "Location", value: (row: StudioClient) => row.location },
    { header: "Measurements", value: (row: StudioClient) => String(countStudioClientMeasurements(row)) },
    { header: "Updated", value: (row: StudioClient) => row.updatedAt ?? "" },
  ];

  return (
    <section className="rounded-xl bg-surface-container p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-headline text-lg font-semibold text-primary">
            {limit === null ? "Walk-in studio clients" : "Recent studio clients"}
          </h2>
          {showFilters && (
            <p className="mt-1 text-sm text-primary/60">
              Private client records designers keep for in-studio fittings and walk-in work.
            </p>
          )}
        </div>
        {showFilters && (
          <div className="flex flex-wrap items-end gap-3">
            <span className="pb-2 text-xs font-medium text-accent">
              {filtered.length} of {studioClients.length}
            </span>
            <AdminFilterExportSlot>
              <AdminExportButton
                filename={`feysefit-studio-clients-${new Date().toISOString().slice(0, 10)}`}
                columns={exportColumns}
                rows={filtered}
              />
            </AdminFilterExportSlot>
          </div>
        )}
        {!showFilters && (
          <span className="text-xs font-medium text-accent">
            {designerId ? filtered.length : studioClients.length}
          </span>
        )}
      </div>

      {showFilters && (
        <AdminFilterToolbar className="mb-6" gridClassName="grid min-w-0 flex-1 gap-4 md:grid-cols-2">
          <AdminSearchField
            id="studio-client-search"
            value={query}
            onChange={setQuery}
            placeholder="Search name, phone, email…"
          />
          <Select
            label="Designer"
            options={designerOptions}
            value={designerFilter}
            onChange={(event) => setDesignerFilter(event.target.value)}
          />
        </AdminFilterToolbar>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-primary/15 px-4 py-8 text-center text-sm text-primary/60">
          No walk-in studio clients match your filters.
        </p>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border border-primary/10">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[18%]" />
              <col className="w-[24%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="bg-card text-xs uppercase tracking-wide text-primary/55">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Designer</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Measurements</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/8 bg-background/50">
              {rows.map((client) => (
                <tr key={client.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="break-words font-medium leading-snug text-primary">{client.name}</p>
                    {client.location && (
                      <p className="mt-0.5 text-xs text-primary/55">{client.location}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {client.designerLegacyId ? (
                      <Link
                        href={`/dashboard/admin/designers/${client.designerLegacyId}`}
                        className="break-words text-accent hover:underline"
                      >
                        {client.designerName ?? "View designer"}
                      </Link>
                    ) : (
                      <span className="break-words text-primary/70">{client.designerName ?? "—"}</span>
                    )}
                  </td>
                  <td className="break-all px-4 py-3 text-primary/70">
                    <p>{client.phone || "—"}</p>
                    <p className="text-xs">{client.email || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-primary/70">
                    {countStudioClientMeasurements(client)} recorded
                  </td>
                  <td className="px-4 py-3 text-primary/55">
                    {client.updatedAt
                      ? new Date(client.updatedAt).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {limit !== null && filtered.length > (limit ?? 5) && (
        <div className="mt-4 text-right">
          <Link
            href="/dashboard/admin/studio-clients"
            className="text-sm font-medium text-accent hover:underline"
          >
            View all studio clients
          </Link>
        </div>
      )}
    </section>
  );
}
