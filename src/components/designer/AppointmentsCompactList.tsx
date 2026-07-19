"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AppointmentActionBar } from "@/components/designer/AppointmentActionBar";
import {
  formatAppointmentSourceLabel,
  formatAppointmentStatus,
  formatAppointmentType,
  formatDayKeyLabel,
  formatMeetingMode,
  groupAppointmentsByDay,
  isPendingCustomerRequest,
  type StudioAppointment,
} from "@/lib/local-customer";

interface AppointmentsCompactListProps {
  appointments: StudioAppointment[];
  clientNameById: Map<string, string>;
  designerId: string;
  onUpdated: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
  focusDayKey?: string | null;
}

function resolveClientLabel(
  appointment: StudioAppointment,
  clientNameById: Map<string, string>
) {
  if (appointment.studioClientName) return appointment.studioClientName;
  if (appointment.customerName) return appointment.customerName;
  if (appointment.studioClientId) {
    return clientNameById.get(appointment.studioClientId) ?? "Client";
  }
  return "Client";
}

function formatTime(scheduledAt?: string) {
  if (!scheduledAt) return "—";
  return new Date(scheduledAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusTone(status: StudioAppointment["status"]) {
  if (status === "requested") return "bg-amber-100 text-amber-900";
  if (status === "confirmed") return "bg-emerald-100 text-emerald-800";
  if (status === "rescheduled") return "bg-amber-50 text-amber-800";
  if (status === "completed") return "bg-primary/10 text-primary/70";
  if (status === "cancelled" || status === "no_show") return "bg-red-50 text-red-700";
  return "bg-primary/10 text-primary";
}

export function AppointmentsCompactList({
  appointments,
  clientNameById,
  designerId,
  onUpdated,
  onToast,
  focusDayKey,
}: AppointmentsCompactListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { unscheduled, scheduled } = groupAppointmentsByDay(appointments);

  const orderedGroups = focusDayKey
    ? [
        ...scheduled.filter((group) => group.dayKey === focusDayKey),
        ...scheduled.filter((group) => group.dayKey !== focusDayKey),
      ]
    : scheduled;

  const sections = [
    ...(unscheduled.length
      ? [{ dayKey: "unscheduled", items: unscheduled }]
      : []),
    ...orderedGroups,
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const isFocused = focusDayKey === section.dayKey;
        const isUnscheduled = section.dayKey === "unscheduled";

        return (
          <section
            key={section.dayKey}
            className={`overflow-hidden rounded-xl border ${
              isFocused
                ? "border-accent/40 ring-1 ring-accent/20"
                : isUnscheduled
                  ? "border-amber-200"
                  : "border-primary/10"
            }`}
          >
            <header
              className={`flex items-center justify-between gap-3 border-b px-4 py-2.5 ${
                isUnscheduled ? "bg-amber-50/80" : "bg-surface-container"
              }`}
            >
              <h2 className="text-sm font-semibold text-primary">
                {formatDayKeyLabel(section.dayKey)}
              </h2>
              <span className="text-xs text-primary/55">
                {section.items.length} appointment{section.items.length === 1 ? "" : "s"}
              </span>
            </header>

            <div className="divide-y divide-primary/8 bg-background/40">
              {section.items.map((appointment) => {
                const expanded = expandedId === appointment.id;
                const pending = isPendingCustomerRequest(appointment);
                const clientLabel = resolveClientLabel(appointment, clientNameById);
                const notePreview = [
                  appointment.customerNotes.trim(),
                  appointment.designerNotes.trim(),
                  appointment.locationNotes.trim(),
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <div key={appointment.id} className={pending ? "bg-amber-50/30" : undefined}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((current) =>
                          current === appointment.id ? null : appointment.id
                        )
                      }
                      className="grid w-full grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-primary/[0.03] sm:grid-cols-[4rem_minmax(0,1.2fr)_minmax(0,1fr)_auto_auto]"
                    >
                      <span className="text-sm font-semibold tabular-nums text-primary">
                        {formatTime(appointment.scheduledAt)}
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-primary">
                          {clientLabel}
                        </span>
                        <span className="hidden truncate text-xs text-primary/55 sm:block">
                          {formatAppointmentType(appointment.appointmentType)} ·{" "}
                          {formatMeetingMode(appointment.meetingMode)}
                        </span>
                      </span>

                      <span className="hidden truncate text-xs text-primary/55 sm:block">
                        {notePreview || formatAppointmentSourceLabel(appointment)}
                      </span>

                      <span
                        className={`hidden rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline ${statusTone(appointment.status)}`}
                      >
                        {formatAppointmentStatus(appointment.status)}
                      </span>

                      <span className="flex items-center justify-end text-primary/45">
                        {expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                    </button>

                    {expanded && (
                      <div className="border-t border-primary/8 bg-surface-container/50 px-4 py-3">
                        <div className="mb-3 space-y-1 text-sm text-primary/70 sm:hidden">
                          <p>
                            {formatAppointmentType(appointment.appointmentType)} ·{" "}
                            {formatMeetingMode(appointment.meetingMode)}
                          </p>
                          <p>{formatAppointmentSourceLabel(appointment)}</p>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(appointment.status)}`}
                          >
                            {formatAppointmentStatus(appointment.status)}
                          </span>
                        </div>

                        {appointment.customerNotes && (
                          <p className="mb-2 text-sm text-primary/75">
                            <span className="font-medium text-primary/85">Client reason:</span>{" "}
                            {appointment.customerNotes}
                          </p>
                        )}
                        {appointment.designerNotes && (
                          <p className="mb-2 text-sm text-primary/65">
                            <span className="font-medium text-primary/75">Your note:</span>{" "}
                            {appointment.designerNotes}
                          </p>
                        )}
                        {appointment.locationNotes && (
                          <p className="mb-3 text-sm text-primary/65">
                            <span className="font-medium text-primary/75">Location:</span>{" "}
                            {appointment.locationNotes}
                          </p>
                        )}

                        <AppointmentActionBar
                          appointment={appointment}
                          designerId={designerId}
                          onUpdated={onUpdated}
                          onToast={onToast}
                          compact
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
