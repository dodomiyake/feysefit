"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { AdminExportButton } from "@/components/admin/AdminExportButton";
import { AdminFilterExportSlot, AdminFilterToolbar } from "@/components/admin/AdminFilterToolbar";
import { AdminSearchField } from "@/components/admin/AdminSearchField";
import { Select } from "@/components/ui/Select";
import {
  APPOINTMENT_STATUS_OPTIONS,
  formatAppointmentStatus,
  formatAppointmentType,
  formatDayKeyLabel,
  formatMeetingMode,
  getDefaultAppointmentDayKey,
  isPendingCustomerRequest,
  toLocalDateKey,
  type StudioAppointment,
} from "@/lib/local-customer";
import { matchesAdminDesignerFilter } from "@/lib/admin-designer-filter";

function clientLabel(appointment: StudioAppointment) {
  return (
    appointment.studioClientName ??
    appointment.customerName ??
    (appointment.studioClientId ? "Walk-in client" : appointment.customerId ? "App client" : "Client")
  );
}

interface AdminAppointmentsTableProps {
  limit?: number | null;
  showFilters?: boolean;
  designerId?: string;
}

export function AdminAppointmentsTable({
  limit = null,
  showFilters = true,
  designerId,
}: AdminAppointmentsTableProps = {}) {
  const { appointments, designers } = useApp();
  const [query, setQuery] = useState("");
  const [designerFilter, setDesignerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("");
  const [dayReady, setDayReady] = useState(false);
  const defaultDayKey = useMemo(
    () => getDefaultAppointmentDayKey(appointments),
    [appointments]
  );
  const [prevDefaultDayKey, setPrevDefaultDayKey] = useState(defaultDayKey);

  if (defaultDayKey !== prevDefaultDayKey || !dayReady) {
    setPrevDefaultDayKey(defaultDayKey);
    setDayFilter(defaultDayKey);
    if (!dayReady) setDayReady(true);
  }

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
    return appointments.filter((appointment) => {
      if (designerId && !matchesAdminDesignerFilter(appointment, designerId, designers)) return false;
      if (
        designerFilter !== "all" &&
        !matchesAdminDesignerFilter(appointment, designerFilter, designers)
      ) {
        return false;
      }
      if (statusFilter !== "all" && appointment.status !== statusFilter) return false;
      if (dayFilter && dayReady) {
        if (!appointment.scheduledAt) return false;
        if (toLocalDateKey(appointment.scheduledAt) !== dayFilter) return false;
      }
      if (!normalized) return true;
      const haystack =
        `${clientLabel(appointment)} ${appointment.designerName ?? ""} ${formatAppointmentType(appointment.appointmentType)} ${appointment.customerNotes} ${appointment.designerNotes}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [appointments, query, designerFilter, statusFilter, dayFilter, dayReady, designerId, designers]);

  const rows = limit === null ? filtered : filtered.slice(0, limit ?? 5);

  const exportColumns = [
    { header: "Date", value: (row: StudioAppointment) => row.scheduledAt ?? "" },
    { header: "Client", value: (row: StudioAppointment) => clientLabel(row) },
    { header: "Designer", value: (row: StudioAppointment) => row.designerName ?? "" },
    { header: "Type", value: (row: StudioAppointment) => formatAppointmentType(row.appointmentType) },
    { header: "Mode", value: (row: StudioAppointment) => formatMeetingMode(row.meetingMode) },
    { header: "Status", value: (row: StudioAppointment) => formatAppointmentStatus(row.status) },
    { header: "Client notes", value: (row: StudioAppointment) => row.customerNotes },
    { header: "Designer notes", value: (row: StudioAppointment) => row.designerNotes },
  ];

  const pendingCount = appointments.filter((item) => isPendingCustomerRequest(item)).length;

  return (
    <section className="rounded-xl bg-surface-container p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-headline text-lg font-semibold text-primary">
            {limit === null ? "Appointments" : "Recent appointments"}
          </h2>
          {showFilters && (
            <p className="mt-1 text-sm text-primary/60">
              Designer-scheduled sessions, walk-in bookings, and client requests across the platform.
            </p>
          )}
          {showFilters && pendingCount > 0 && (
            <p className="mt-2 text-sm font-medium text-amber-800">
              {pendingCount} flexible request{pendingCount === 1 ? "" : "s"} awaiting designer response
            </p>
          )}
        </div>
        {showFilters && (
          <div className="flex flex-wrap items-end gap-3">
            <span className="pb-2 text-xs font-medium text-accent">
              {filtered.length} of {appointments.length}
            </span>
            <AdminFilterExportSlot>
              <AdminExportButton
                filename={`feysefit-appointments-${new Date().toISOString().slice(0, 10)}`}
                columns={exportColumns}
                rows={filtered}
              />
            </AdminFilterExportSlot>
          </div>
        )}
        {!showFilters && (
          <span className="text-xs font-medium text-accent">
            {designerId ? filtered.length : appointments.length}
          </span>
        )}
      </div>

      {showFilters && (
        <AdminFilterToolbar className="mb-6">
          <div className="md:col-span-2">
            <AdminSearchField
              id="appointment-search"
              value={query}
              onChange={setQuery}
              placeholder="Search client, designer, notes…"
            />
          </div>
          <Select
            label="Designer"
            options={designerOptions}
            value={designerFilter}
            onChange={(event) => setDesignerFilter(event.target.value)}
          />
          <Select
            label="Status"
            options={[
              { value: "all", label: "All statuses" },
              ...APPOINTMENT_STATUS_OPTIONS,
            ]}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          />
          <div className="space-y-1.5">
            <label htmlFor="appointment-day" className="block text-sm font-medium text-primary">
              Day
            </label>
            <div className="flex gap-2">
              <input
                id="appointment-day"
                type="date"
                value={dayFilter}
                onChange={(event) => setDayFilter(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-card bg-background px-4 py-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <button
                type="button"
                onClick={() => setDayFilter("")}
                className="shrink-0 rounded-lg border border-primary/15 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/5"
              >
                All days
              </button>
            </div>
          </div>
        </AdminFilterToolbar>
      )}

      {showFilters && dayFilter && dayReady && (
        <p className="mb-4 text-sm text-primary/60">
          Showing appointments for {formatDayKeyLabel(dayFilter)}.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-primary/15 px-4 py-8 text-center text-sm text-primary/60">
          No appointments match your filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-primary/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-card text-xs uppercase tracking-wide text-primary/55">
              <tr>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Designer</th>
                <th className="px-4 py-3 font-semibold">Session</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/8 bg-background/50">
              {rows.map((appointment) => (
                <tr
                  key={appointment.id}
                  className={isPendingCustomerRequest(appointment) ? "bg-amber-50/40" : undefined}
                >
                  <td className="px-4 py-3 text-primary/80">
                    {appointment.scheduledAt
                      ? new Date(appointment.scheduledAt).toLocaleString("en-GB")
                      : "Flexible / pending"}
                  </td>
                  <td className="px-4 py-3 font-medium text-primary">{clientLabel(appointment)}</td>
                  <td className="px-4 py-3">
                    {appointment.designerLegacyId ? (
                      <Link
                        href={`/dashboard/admin/designers/${appointment.designerLegacyId}`}
                        className="text-accent hover:underline"
                      >
                        {appointment.designerName ?? "View designer"}
                      </Link>
                    ) : (
                      <span className="text-primary/70">{appointment.designerName ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-primary/70">
                    {formatAppointmentType(appointment.appointmentType)}
                    <span className="block text-xs text-primary/55">
                      {formatMeetingMode(appointment.meetingMode)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {formatAppointmentStatus(appointment.status)}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-primary/65">
                    {[appointment.customerNotes, appointment.designerNotes, appointment.locationNotes]
                      .filter(Boolean)
                      .join(" · ") || "—"}
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
            href="/dashboard/admin/appointments"
            className="text-sm font-medium text-accent hover:underline"
          >
            View all appointments
          </Link>
        </div>
      )}
    </section>
  );
}
