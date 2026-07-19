"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Printer } from "lucide-react";
import type { StudioClient } from "@/lib/studio-client";
import {
  filterAppointmentsForDay,
  formatAppointmentStatus,
  formatAppointmentType,
  formatDayKeyLabel,
  formatMeetingMode,
  getDefaultAppointmentDayKey,
  toLocalDateKey,
  type StudioAppointment,
} from "@/lib/local-customer";
import { downloadAppointmentDayPdf } from "@/lib/appointment-day-pdf";
import { Button } from "@/components/ui/Button";

interface AppointmentDayPrintProps {
  appointments: StudioAppointment[];
  studioClients: StudioClient[];
  designerName?: string;
  dayKey: string;
  onDayKeyChange: (dayKey: string) => void;
}

function resolveClientLabel(
  appointment: StudioAppointment,
  studioClients: StudioClient[]
) {
  if (appointment.studioClientName) return appointment.studioClientName;
  if (appointment.customerName) return appointment.customerName;
  if (appointment.studioClientId) {
    return studioClients.find((client) => client.id === appointment.studioClientId)?.name ?? "Client";
  }
  return "Client";
}

export function AppointmentDayPrint({
  appointments,
  studioClients,
  designerName,
  dayKey,
  onDayKeyChange,
}: AppointmentDayPrintProps) {
  const [generating, setGenerating] = useState(false);
  const autoAdjustedRef = useRef(false);

  useEffect(() => {
    if (autoAdjustedRef.current || appointments.length === 0) return;
    const preferredDay = getDefaultAppointmentDayKey(appointments);
    if (
      filterAppointmentsForDay(appointments, dayKey).length === 0 &&
      filterAppointmentsForDay(appointments, preferredDay).length > 0
    ) {
      onDayKeyChange(preferredDay);
      autoAdjustedRef.current = true;
    }
  }, [appointments, dayKey, onDayKeyChange]);

  const dayAppointments = useMemo(
    () => filterAppointmentsForDay(appointments, dayKey),
    [appointments, dayKey]
  );

  const nextScheduledDay = useMemo(() => {
    const today = toLocalDateKey(new Date());
    const days = [
      ...new Set(
        appointments
          .filter(
            (appointment) =>
              appointment.scheduledAt && !["cancelled"].includes(appointment.status)
          )
          .map((appointment) => toLocalDateKey(appointment.scheduledAt!))
      ),
    ].sort();
    return days.find((day) => day > dayKey) ?? days.find((day) => day >= today) ?? null;
  }, [appointments, dayKey]);

  const dayLabel = useMemo(() => formatDayKeyLabel(dayKey), [dayKey]);

  function buildPdfRows() {
    return dayAppointments.map((appointment) => ({
      time: appointment.scheduledAt
        ? new Date(appointment.scheduledAt).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
      client: resolveClientLabel(appointment, studioClients),
      type: formatAppointmentType(appointment.appointmentType),
      mode: formatMeetingMode(appointment.meetingMode),
      status: formatAppointmentStatus(appointment.status),
      notes:
        [
          appointment.customerNotes.trim(),
          appointment.designerNotes.trim(),
          appointment.locationNotes.trim(),
        ]
          .filter(Boolean)
          .join(" · ") || "—",
    }));
  }

  async function handleDownloadPdf() {
    if (!dayAppointments.length) return;
    setGenerating(true);
    try {
      downloadAppointmentDayPdf({
        dayLabel,
        dayKey,
        designerName,
        rows: buildPdfRows(),
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="rounded-xl border border-primary/10 bg-surface-container p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-headline text-lg font-semibold text-primary">Daily run sheet</h2>
          <p className="mt-1 text-sm text-primary/60">
            Pick a day, download the PDF, and review that day&apos;s compact list below.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-primary/60">Date</span>
            <input
              type="date"
              value={dayKey}
              onChange={(event) => onDayKeyChange(event.target.value)}
              className="rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => void handleDownloadPdf()}
            disabled={dayAppointments.length === 0 || generating}
          >
            <Printer className="h-4 w-4" />
            {generating ? "Generating PDF…" : "Print day list"}
          </Button>
        </div>
      </div>

      <p className="mt-3 text-sm text-primary/70">
        {dayAppointments.length
          ? `${dayAppointments.length} appointment${dayAppointments.length === 1 ? "" : "s"} on ${dayLabel}`
          : `No appointments scheduled for ${dayLabel}.`}
        {!dayAppointments.length && nextScheduledDay ? (
          <>
            {" "}
            <button
              type="button"
              onClick={() => onDayKeyChange(nextScheduledDay)}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Jump to {formatDayKeyLabel(nextScheduledDay)}
            </button>
          </>
        ) : null}
      </p>
    </section>
  );
}
