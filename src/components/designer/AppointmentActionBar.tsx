"use client";

import { useState } from "react";
import type { StudioAppointment } from "@/lib/local-customer";
import { formatAppointmentStatus, isPendingCustomerRequest } from "@/lib/local-customer";
import { updateAppointmentStatus } from "@/lib/services/appointmentService";

interface AppointmentActionBarProps {
  appointment: StudioAppointment;
  designerId: string;
  onUpdated: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
  compact?: boolean;
}

export function AppointmentActionBar({
  appointment,
  designerId,
  onUpdated,
  onToast,
  compact = false,
}: AppointmentActionBarProps) {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleAt, setRescheduleAt] = useState(
    appointment.scheduledAt ? appointment.scheduledAt.slice(0, 16) : ""
  );
  const [designerNotes, setDesignerNotes] = useState(appointment.designerNotes);
  const [busy, setBusy] = useState(false);

  async function apply(
    patch: Parameters<typeof updateAppointmentStatus>[2],
    message: string
  ) {
    setBusy(true);
    try {
      await updateAppointmentStatus(designerId, appointment.id, patch);
      onUpdated();
      onToast(message, "success");
      setRescheduleOpen(false);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Update failed", "error");
    } finally {
      setBusy(false);
    }
  }

  const isPendingRequest = isPendingCustomerRequest(appointment);
  const needsScheduledTime = isPendingRequest && !appointment.scheduledAt;
  const isActive =
    isPendingRequest ||
    appointment.status === "confirmed" ||
    appointment.status === "rescheduled";

  const actionButtonClass = compact
    ? "rounded-full border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60"
    : "rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-60";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {isPendingRequest && (
        <div className="space-y-2">
          {needsScheduledTime && (
            <p className="text-xs text-amber-900">
              The client did not pick a time. Set a date below to confirm this appointment.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (needsScheduledTime) {
                setRescheduleOpen(true);
                return;
              }
              void apply({ status: "confirmed" }, "Appointment confirmed");
            }}
            className={`${actionButtonClass} bg-emerald-600 text-white border-emerald-600`}
          >
            {needsScheduledTime ? "Set time & confirm" : "Confirm"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setRescheduleOpen((open) => !open)}
            className={`${actionButtonClass} border-amber-300 bg-amber-50 text-amber-900`}
          >
            Suggest another time
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => apply({ status: "cancelled" }, "Appointment rejected")}
            className={`${actionButtonClass} border-red-200 text-red-700`}
          >
            Reject
          </button>
          </div>
        </div>
      )}

      {isActive && !isPendingRequest && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setRescheduleOpen((open) => !open)}
            className={`${actionButtonClass} border-primary/15 text-primary`}
          >
            Reschedule
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => apply({ status: "cancelled" }, "Appointment cancelled")}
            className={`${actionButtonClass} border-primary/15 text-primary`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => apply({ status: "completed" }, "Appointment completed")}
            className={`${actionButtonClass} border-primary/15 text-primary`}
          >
            Complete
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => apply({ status: "no_show" }, "Marked as no show")}
            className={`${actionButtonClass} border-primary/15 text-primary`}
          >
            No show
          </button>
        </div>
      )}

      {rescheduleOpen && (
        <div className="rounded-lg border border-primary/10 bg-background/70 p-3">
          <label className="block text-sm">
            <span className="mb-1 block text-primary/60">
              {isPendingRequest ? "Proposed date & time" : "New date & time"}
            </span>
            <input
              type="datetime-local"
              value={rescheduleAt}
              onChange={(e) => setRescheduleAt(e.target.value)}
              className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
            />
          </label>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-primary/60">Message to client</span>
            <textarea
              value={designerNotes}
              onChange={(e) => setDesignerNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
            />
          </label>
          <button
            type="button"
            disabled={busy || !rescheduleAt}
            onClick={() =>
              void apply(
                {
                  status: isPendingRequest ? "confirmed" : "rescheduled",
                  scheduledAt: new Date(rescheduleAt).toISOString(),
                  designerNotes,
                },
                isPendingRequest ? "Appointment confirmed" : "Suggested a new time"
              )
            }
            className={`mt-2 ${actionButtonClass} bg-primary text-white border-primary`}
          >
            {isPendingRequest ? "Confirm with this time" : "Send new time"}
          </button>
        </div>
      )}

      {!isActive && (
        <p className="text-xs text-primary/55">
          Status: {formatAppointmentStatus(appointment.status)}
        </p>
      )}
    </div>
  );
}
