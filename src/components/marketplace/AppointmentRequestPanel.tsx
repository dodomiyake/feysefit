"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Designer } from "@/lib/mock-data";
import {
  generateAvailableSlots,
  groupSlotsByDate,
  type SlotBookingConflict,
} from "@/lib/appointment-slots";
import {
  customerMayRequestAppointment,
  meetingModesForDesigner,
} from "@/lib/appointment-access";
import { useApp } from "@/context/AppContext";
import {
  APPOINTMENT_TYPE_OPTIONS,
  MEETING_MODE_OPTIONS,
  formatMeetingMode,
  type AppointmentType,
  type MeetingMode,
} from "@/lib/local-customer";
import { requestCustomerAppointment } from "@/lib/services/appointmentService";
import { toUserFacingSupabaseError } from "@/lib/supabase-errors";
import {
  getDesignerAvailability,
  listDesignerBookedSlots,
} from "@/lib/services/availabilityService";
import { Calendar } from "lucide-react";

function toDatetimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function datetimeLocalToIso(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function AppointmentRequestPanel({ designer }: { designer: Designer }) {
  const { authUser, customerLink, projects, showToast } = useApp();
  const customerId = authUser?.customerId;
  const [appointmentType, setAppointmentType] = useState<AppointmentType>("consultation");
  const [meetingMode, setMeetingMode] = useState<MeetingMode>("in_person");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [proposedLocal, setProposedLocal] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [flexibleTiming, setFlexibleTiming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Awaited<
    ReturnType<typeof getDesignerAvailability>
  > | null>(null);
  const [bookedSlots, setBookedSlots] = useState<SlotBookingConflict[]>([]);

  const hasActiveProject = projects.some(
    (project) => project.designerId === designer.id && project.status !== "Delivered"
  );
  const canBook = Boolean(
    customerId &&
      customerMayRequestAppointment(customerLink, designer.id, {
        hasActiveProjectWithDesigner: hasActiveProject,
      })
  );

  const loadBookingData = useCallback(async () => {
    setLoadingAvailability(true);
    setLoadError(null);
    try {
      const settings = await getDesignerAvailability(designer.id);
      setAvailability(settings);
      try {
        const holds = await listDesignerBookedSlots(designer.id);
        setBookedSlots(holds);
      } catch (holdsError) {
        console.error("Could not load booked slots", holdsError);
        setBookedSlots([]);
      }
    } catch (error) {
      console.error("Could not load designer availability", error);
      setAvailability(null);
      setBookedSlots([]);
      setLoadError(toUserFacingSupabaseError(error, "Could not load open appointment times."));
    } finally {
      setLoadingAvailability(false);
    }
  }, [designer.id]);

  useEffect(() => {
    if (!canBook) return;
    void loadBookingData();
  }, [canBook, loadBookingData]);

  const meetingModes = useMemo(() => {
    const fromDesigner = meetingModesForDesigner({
      ...designer,
      offeredMeetingModes: availability?.offeredMeetingModes ?? designer.offeredMeetingModes,
    });
    return fromDesigner.length ? fromDesigner : (["in_person", "video", "phone"] as MeetingMode[]);
  }, [availability?.offeredMeetingModes, designer]);

  const slots = useMemo(() => {
    if (!availability?.dates.length) return [];
    return generateAvailableSlots({
      dates: availability.dates,
      slotMinutes: availability.slotMinutes,
      existingAppointments: bookedSlots,
    });
  }, [availability, bookedSlots]);

  const slotGroups = useMemo(() => groupSlotsByDate(slots), [slots]);
  /** Book mode: designer has free open slots the client can confirm instantly. */
  const isBookMode = slotGroups.length > 0;
  /** Request mode: no open slots — client asks designer to schedule. */
  const isRequestMode = !loadingAvailability && !isBookMode;
  const minLocal = useMemo(() => toDatetimeLocalValue(new Date()), []);

  if (!customerId) return null;

  if (!canBook) {
    return (
      <section className="rounded-2xl border border-primary/10 bg-card/50 p-5 lg:p-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent" />
          <h2 className="font-headline text-lg font-semibold text-primary">Appointments</h2>
        </div>
        <p className="mt-2 text-sm text-primary/60">
          Appointments are only available with your linked designer or on active projects. Connect with
          this designer first to request a visit or remote session.
        </p>
      </section>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!customerId) return;

    if (isBookMode) {
      if (!selectedSlot) {
        showToast("Choose an open time slot to book", "error");
        return;
      }
      setSubmitting(true);
      try {
        await requestCustomerAppointment(customerId, designer.id, {
          appointmentType,
          meetingMode,
          scheduledAt: selectedSlot,
          customerNotes,
          durationMinutes: availability?.slotMinutes ?? 30,
        });
        showToast("Appointment booked — your designer has been notified", "success");
        setCustomerNotes("");
        setSelectedSlot("");
        await loadBookingData();
      } catch (error) {
        showToast(toUserFacingSupabaseError(error, "Booking failed"), "error");
        await loadBookingData();
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const proposedIso = proposedLocal ? datetimeLocalToIso(proposedLocal) : null;
    if (proposedLocal && !proposedIso) {
      showToast("Enter a valid date and time", "error");
      return;
    }
    if (!proposedIso && !flexibleTiming) {
      showToast("Propose a date and time, or choose flexible timing", "error");
      return;
    }

    setSubmitting(true);
    try {
      await requestCustomerAppointment(customerId, designer.id, {
        appointmentType,
        meetingMode,
        scheduledAt: flexibleTiming ? undefined : proposedIso || undefined,
        customerNotes,
        durationMinutes: availability?.slotMinutes ?? 30,
      });
      showToast(
        proposedIso && !flexibleTiming
          ? "Appointment request sent with your proposed time"
          : "Appointment request sent — your designer will propose a time",
        "success"
      );
      setCustomerNotes("");
      setProposedLocal("");
      setFlexibleTiming(false);
      await loadBookingData();
    } catch (error) {
      showToast(toUserFacingSupabaseError(error, "Request failed"), "error");
      await loadBookingData();
    } finally {
      setSubmitting(false);
    }
  }

  const submitDisabled = submitting || loadingAvailability
    ? true
    : isBookMode
      ? !selectedSlot
      : !flexibleTiming && !proposedLocal;

  return (
    <section className="rounded-2xl border border-primary/10 bg-card/50 p-5 lg:p-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-accent" />
        <h2 className="font-headline text-lg font-semibold text-primary">
          {loadingAvailability
            ? "Appointments"
            : isBookMode
              ? "Book an appointment"
              : "Request an appointment"}
        </h2>
      </div>
      <p className="mt-2 text-sm text-primary/60">
        {loadingAvailability
          ? "Checking your designer’s open times…"
          : isBookMode
            ? "Your designer has open slots. Pick a time to book instantly."
            : "Your designer has not published open slots right now. Send a request and they will confirm a time with you."}
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
          <span className="mb-1 block text-primary/60">How would you like to meet?</span>
          <select
            value={meetingMode}
            onChange={(e) => setMeetingMode(e.target.value as MeetingMode)}
            className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
          >
            {meetingModes.map((mode) => {
              const option = MEETING_MODE_OPTIONS.find((item) => item.value === mode);
              return (
                <option key={mode} value={mode}>
                  {option?.label ?? formatMeetingMode(mode)}
                </option>
              );
            })}
          </select>
        </label>

        {loadingAvailability ? (
          <p className="text-sm text-primary/55">Loading available times…</p>
        ) : loadError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <p>{loadError}</p>
            <p className="mt-2">
              You can still send a flexible request, or run{" "}
              <code className="text-xs">supabase/patch-availability-calendar-rpc.sql</code> in
              Supabase so published slots appear.
            </p>
            <button
              type="button"
              onClick={() => void loadBookingData()}
              className="mt-2 text-sm font-semibold underline"
            >
              Try again
            </button>
          </div>
        ) : null}

        {isBookMode ? (
          <div className="block text-sm">
            <span className="mb-2 block text-primary/60">Choose an open slot</span>
            <div className="space-y-4">
              {slotGroups.map(([dateLabel, daySlots]) => (
                <div key={dateLabel}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary/55">
                    {dateLabel}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {daySlots.map((slot) => (
                      <button
                        key={slot.iso}
                        type="button"
                        onClick={() => setSelectedSlot(slot.iso)}
                        className={`rounded-lg border px-3 py-2 text-left text-sm ${
                          selectedSlot === slot.iso
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-primary/15 text-primary/80 hover:border-primary/30"
                        }`}
                      >
                        {new Date(slot.iso).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {isRequestMode ? (
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-primary/60">Propose a date & time (optional)</span>
              <input
                type="datetime-local"
                min={minLocal}
                value={proposedLocal}
                disabled={flexibleTiming}
                onChange={(e) => {
                  setProposedLocal(e.target.value);
                  setFlexibleTiming(false);
                }}
                className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary disabled:opacity-60"
              />
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-primary/10 bg-background/60 px-3 py-2">
              <input
                type="checkbox"
                checked={flexibleTiming}
                onChange={(e) => {
                  setFlexibleTiming(e.target.checked);
                  if (e.target.checked) setProposedLocal("");
                }}
                className="mt-0.5"
              />
              <span className="text-sm text-primary/75">
                I&apos;m flexible — my designer can suggest a time
              </span>
            </label>
          </div>
        ) : null}

        <label className="block text-sm">
          <span className="mb-1 block text-primary/60">Notes for the designer</span>
          <textarea
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            rows={2}
            placeholder="What would you like to cover in this session?"
            className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
          />
        </label>

        <button
          type="submit"
          disabled={submitDisabled}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting
            ? isBookMode
              ? "Booking…"
              : "Sending…"
            : isBookMode
              ? "Book appointment"
              : "Request appointment"}
        </button>
      </form>
    </section>
  );
}
