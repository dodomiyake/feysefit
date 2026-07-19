"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  APPOINTMENT_TYPE_OPTIONS,
  MEETING_MODE_OPTIONS,
  type AppointmentType,
  type MeetingMode,
} from "@/lib/local-customer";
import { toUserFacingSupabaseError } from "@/lib/supabase-errors";
import { createAppointment } from "@/lib/services/appointmentService";
import { Button } from "@/components/ui/Button";

interface CreateAppointmentFormProps {
  designerId: string;
  onCreated?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateAppointmentForm({
  designerId,
  onCreated,
  open: controlledOpen,
  onOpenChange,
}: CreateAppointmentFormProps) {
  const searchParams = useSearchParams();
  const { customers, studioClients, refreshAppData, showToast } = useApp();

  const initialStudioClientId = searchParams.get("studioClient") ?? "";
  const initialCustomerId = searchParams.get("customer") ?? "";

  const [clientKind, setClientKind] = useState<"studio" | "app">(
    initialStudioClientId ? "studio" : initialCustomerId ? "app" : "studio"
  );
  const [studioClientId, setStudioClientId] = useState(initialStudioClientId);
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>("measurement");
  const [meetingMode, setMeetingMode] = useState<MeetingMode>("in_person");
  const [scheduledAt, setScheduledAt] = useState("");
  const [locationNotes, setLocationNotes] = useState("");
  const [designerNotes, setDesignerNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [internalOpen, setInternalOpen] = useState(Boolean(initialStudioClientId || initialCustomerId));
  const open = controlledOpen ?? internalOpen;
  const paramsKey = `${initialStudioClientId}:${initialCustomerId}`;
  const [prevParamsKey, setPrevParamsKey] = useState(paramsKey);

  if (paramsKey !== prevParamsKey) {
    setPrevParamsKey(paramsKey);
    if (initialStudioClientId) {
      setClientKind("studio");
      setStudioClientId(initialStudioClientId);
      if (controlledOpen === undefined) setInternalOpen(true);
    } else if (initialCustomerId) {
      setClientKind("app");
      setCustomerId(initialCustomerId);
      if (controlledOpen === undefined) setInternalOpen(true);
    }
  }

  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  const clientOptions = useMemo(() => {
    if (clientKind === "studio") {
      return studioClients.map((client) => ({
        value: client.id,
        label: client.name,
      }));
    }
    return customers.map((customer) => ({
      value: customer.id,
      label: customer.name,
    }));
  }, [clientKind, studioClients, customers]);

  const selectedClientId = clientKind === "studio" ? studioClientId : customerId;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedClientId) {
      showToast("Please select a client", "error");
      return;
    }

    setSubmitting(true);
    try {
      await createAppointment(designerId, {
        studioClientId: clientKind === "studio" ? studioClientId : undefined,
        customerId: clientKind === "app" ? customerId : undefined,
        appointmentType,
        meetingMode,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        locationNotes,
        designerNotes,
        status: "confirmed",
      });
      await refreshAppData();
      showToast("Appointment scheduled", "success");
      setScheduledAt("");
      setLocationNotes("");
      setDesignerNotes("");
      setOpen(false);
      onCreated?.();
    } catch (error) {
      showToast(toUserFacingSupabaseError(error, "Could not schedule appointment"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    if (controlledOpen !== undefined) {
      return null;
    }

    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
      >
        Schedule appointment
      </button>
    );
  }

  return (
    <section className="rounded-xl border border-primary/10 bg-surface-container p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-lg font-semibold text-primary">Schedule appointment</h2>
          <p className="mt-1 text-sm text-primary/60">
            Book measurement, fitting, consultation, alteration, or pickup for a walk-in or app client.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-primary/50 hover:text-primary"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-primary/60">Client type</span>
          <select
            value={clientKind}
            onChange={(e) => {
              const next = e.target.value as "studio" | "app";
              setClientKind(next);
              if (next === "studio") {
                setCustomerId("");
                setStudioClientId(studioClients[0]?.id ?? "");
              } else {
                setStudioClientId("");
                setCustomerId(customers[0]?.id ?? "");
              }
            }}
            className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
          >
            <option value="studio">Studio / walk-in client</option>
            <option value="app">App client</option>
          </select>
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-primary/60">Client</span>
          {clientOptions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-primary/15 px-3 py-2 text-sm text-primary/55">
              {clientKind === "studio"
                ? "No studio clients yet. Add one from Client Database → Studio clients."
                : "No linked app clients yet."}
            </p>
          ) : (
            <select
              value={selectedClientId}
              onChange={(e) =>
                clientKind === "studio"
                  ? setStudioClientId(e.target.value)
                  : setCustomerId(e.target.value)
              }
              className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
              required
            >
              <option value="">Select client</option>
              {clientOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-primary/60">Appointment type</span>
          <select
            value={appointmentType}
            onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
            className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
          >
            {APPOINTMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-primary/60">Meeting format</span>
          <select
            value={meetingMode}
            onChange={(e) => setMeetingMode(e.target.value as MeetingMode)}
            className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
          >
            {MEETING_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-primary/60">Date & time</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-primary/60">Location / studio notes</span>
          <input
            value={locationNotes}
            onChange={(e) => setLocationNotes(e.target.value)}
            placeholder="e.g. Main studio, fitting room 2"
            className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-primary/60">Message for the client (optional)</span>
          <textarea
            value={designerNotes}
            onChange={(e) => setDesignerNotes(e.target.value)}
            rows={2}
            placeholder="Included in the client's appointment notification"
            className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
          />
        </label>

        <div className="sm:col-span-2">
          <Button type="submit" disabled={submitting || clientOptions.length === 0}>
            {submitting ? "Scheduling…" : "Schedule appointment"}
          </Button>
        </div>
      </form>
    </section>
  );
}
