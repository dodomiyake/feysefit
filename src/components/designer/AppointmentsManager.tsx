"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { CreateAppointmentForm } from "@/components/designer/CreateAppointmentForm";
import { AppointmentDayPrint } from "@/components/designer/AppointmentDayPrint";
import { AppointmentsCompactList } from "@/components/designer/AppointmentsCompactList";
import {
  filterAppointmentsForDay,
  getDefaultAppointmentDayKey,
  isPendingCustomerRequest,
  toLocalDateKey,
  type StudioAppointment,
} from "@/lib/local-customer";

export function AppointmentsManager() {
  const { authUser, studioClients, appointments, refreshAppData, showToast, designers } = useApp();
  const searchParams = useSearchParams();
  const designerId = authUser?.designerId ?? "";
  const [filter, setFilter] = useState<"upcoming" | "all">("upcoming");
  const [listScope, setListScope] = useState<"day" | "all">("day");
  const [selectedDayKey, setSelectedDayKey] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(
    () => Boolean(searchParams.get("studioClient") || searchParams.get("customer"))
  );

  useEffect(() => {
    setSelectedDayKey((current) => current || getDefaultAppointmentDayKey(appointments));
  }, [appointments]);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const client of studioClients) map.set(client.id, client.name);
    return map;
  }, [studioClients]);

  const visible = useMemo(() => {
    const sorted = [...appointments].sort((a, b) => {
      const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return aTime - bTime;
    });
    if (filter === "all") return sorted;
    return sorted.filter(
      (item) =>
        item.status === "requested" ||
        item.status === "confirmed" ||
        item.status === "rescheduled"
    );
  }, [appointments, filter]);

  const listAppointments = useMemo(() => {
    if (!selectedDayKey && listScope === "day") return [];

    if (listScope === "all") return visible;

    const onSelectedDay = filterAppointmentsForDay(visible, selectedDayKey);
    const flexible = visible.filter(
      (appointment) => isPendingCustomerRequest(appointment) && !appointment.scheduledAt
    );
    const merged = new Map<string, StudioAppointment>();
    for (const appointment of [...flexible, ...onSelectedDay]) {
      merged.set(appointment.id, appointment);
    }
    return [...merged.values()];
  }, [visible, listScope, selectedDayKey]);

  const requestedCount = appointments.filter((item) => isPendingCustomerRequest(item)).length;
  const designerName =
    designers.find((designer) => designer.id === designerId)?.businessName ??
    authUser?.name ??
    "Studio";

  const selectedDayCount = selectedDayKey
    ? filterAppointmentsForDay(visible, selectedDayKey).length
    : 0;

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-headline text-2xl font-bold text-primary">Appointments</h1>
            <p className="mt-1 max-w-2xl text-sm text-primary/60">
              Scan the day in a compact list, expand a row for actions, and download the PDF run
              sheet.
            </p>
            {requestedCount > 0 && (
              <p className="mt-2 text-sm font-medium text-amber-800">
                {requestedCount} flexible request{requestedCount === 1 ? "" : "s"} awaiting your
                response
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {(["upcoming", "all"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    filter === value ? "bg-primary text-white" : "border border-primary/15 text-primary"
                  }`}
                >
                  {value === "upcoming" ? "Active" : "All"}
                </button>
              ))}
              {(["day", "all"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setListScope(value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    listScope === value ? "bg-accent text-white" : "border border-primary/15 text-primary"
                  }`}
                >
                  {value === "day" ? "Selected day" : "All days"}
                </button>
              ))}
            </div>
          </div>
          {!scheduleOpen && (
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
            >
              Schedule appointment
            </button>
          )}
        </div>

        {scheduleOpen && (
          <CreateAppointmentForm
            designerId={designerId}
            open={scheduleOpen}
            onOpenChange={setScheduleOpen}
            onCreated={() => void refreshAppData()}
          />
        )}
      </div>

      {selectedDayKey ? (
        <AppointmentDayPrint
          appointments={appointments}
          studioClients={studioClients}
          designerName={designerName}
          dayKey={selectedDayKey}
          onDayKeyChange={setSelectedDayKey}
        />
      ) : (
        <section className="rounded-xl border border-primary/10 bg-surface-container p-4 sm:p-5">
          <p className="text-sm text-primary/55">Loading schedule…</p>
        </section>
      )}

      {!selectedDayKey ? null : listAppointments.length === 0 ? (
        <div className="rounded-xl bg-surface-container p-8 text-center text-primary/60">
          <p>No appointments to show.</p>
          <p className="mt-2 text-sm">
            {listScope === "day"
              ? `Nothing scheduled for ${selectedDayKey === toLocalDateKey(new Date()) ? "today" : "this day"}. Try All days or pick another date above.`
              : "Schedule a walk-in client or wait for a client request."}
          </p>
        </div>
      ) : (
        <AppointmentsCompactList
          appointments={listAppointments}
          clientNameById={clientNameById}
          designerId={designerId}
          onUpdated={() => void refreshAppData()}
          onToast={showToast}
          focusDayKey={listScope === "day" ? selectedDayKey : null}
        />
      )}

      {listScope === "day" && selectedDayCount > 0 && (
        <p className="text-xs text-primary/50">
          Showing {selectedDayCount} appointment{selectedDayCount === 1 ? "" : "s"} for the selected
          day. Switch to <span className="font-medium text-primary/70">All days</span> to browse the
          full schedule.
        </p>
      )}
    </div>
  );
}
