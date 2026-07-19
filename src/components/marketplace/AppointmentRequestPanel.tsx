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

export function AppointmentRequestPanel({ designer }: { designer: Designer }) {
  const { authUser, customerLink, projects, showToast } = useApp();
  const customerId = authUser?.customerId;
  const [appointmentType, setAppointmentType] = useState<AppointmentType>("consultation");
  const [meetingMode, setMeetingMode] = useState<MeetingMode>("in_person");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [flexibleTiming, setFlexibleTiming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availability, setAvailability] = useState<Awaited<ReturnType<typeof getDesignerAvailability>> | null>(null);
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
    try {
      const [settings, holds] = await Promise.all([
        getDesignerAvailability(designer.id),
        listDesignerBookedSlots(designer.id),
      ]);
      setAvailability(settings);
      setBookedSlots(holds);
    } catch (error) {
      console.error("Could not load designer availability", error);
      setAvailability(null);
      setBookedSlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  }, [designer.id]);

  const [prevCanBook, setPrevCanBook] = useState(canBook);
  if (canBook !== prevCanBook) {
    setPrevCanBook(canBook);
    if (canBook) setLoadingAvailability(true);
  }

  useEffect(() => {
    if (!canBook) return;
    let cancelled = false;
    void (async () => {
      try {
        const [settings, holds] = await Promise.all([
          getDesignerAvailability(designer.id),
          listDesignerBookedSlots(designer.id),
        ]);
        if (cancelled) return;
        setAvailability(settings);
        setBookedSlots(holds);
      } catch (error) {
        console.error("Could not load designer availability", error);
        if (!cancelled) {
          setAvailability(null);
          setBookedSlots([]);
        }
      } finally {
        if (!cancelled) setLoadingAvailability(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canBook, designer.id]);

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
  const hasPublishedSlots = slotGroups.length > 0;

  if (!customerId) return null;

  if (!canBook) {
    return (
      <section className="rounded-2xl border border-primary/10 bg-card/50 p-5 lg:p-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent" />
          <h2 className="font-headline text-lg font-semibold text-primary">Book an appointment</h2>
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

    if (hasPublishedSlots && !selectedSlot && !flexibleTiming) {
      showToast("Choose a time slot or select flexible timing", "error");
      return;
    }

    setSubmitting(true);
    try {
      const bookedSlot = hasPublishedSlots && selectedSlot && !flexibleTiming;
      await requestCustomerAppointment(customerId, designer.id, {
        appointmentType,
        meetingMode,
        scheduledAt: bookedSlot ? selectedSlot : undefined,
        customerNotes,
        durationMinutes: availability?.slotMinutes ?? 30,
      });
      showToast(
        bookedSlot
          ? "Appointment booked — your designer has been notified"
          : "Appointment request sent — your designer will propose a time",
        "success"
      );
      setCustomerNotes("");
      setSelectedSlot("");
      setFlexibleTiming(false);
      await loadBookingData();
    } catch (error) {
      showToast(toUserFacingSupabaseError(error, "Request failed"), "error");
      await loadBookingData();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-primary/10 bg-card/50 p-5 lg:p-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-accent" />
        <h2 className="font-headline text-lg font-semibold text-primary">Request an appointment</h2>
      </div>
      <p className="mt-2 text-sm text-primary/60">
        {hasPublishedSlots
          ? "Pick an open slot from your designer's calendar (booked instantly), or send a flexible request."
          : "Your designer has not published times yet. You can still send a request — they will confirm and schedule with you."}
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

        <div className="block text-sm">
          <span className="mb-2 block text-primary/60">Choose a date & time (optional)</span>
          {loadingAvailability ? (
            <p className="text-sm text-primary/55">Loading available times…</p>
          ) : hasPublishedSlots ? (
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
                        onClick={() => {
                          setSelectedSlot(slot.iso);
                          setFlexibleTiming(false);
                        }}
                        className={`rounded-lg border px-3 py-2 text-left text-sm ${
                          selectedSlot === slot.iso && !flexibleTiming
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
              <label className="flex items-start gap-2 rounded-lg border border-primary/10 bg-background/60 px-3 py-2">
                <input
                  type="checkbox"
                  checked={flexibleTiming}
                  onChange={(e) => {
                    setFlexibleTiming(e.target.checked);
                    if (e.target.checked) setSelectedSlot("");
                  }}
                  className="mt-0.5"
                />
                <span className="text-sm text-primary/75">
                  I&apos;m flexible — my designer can suggest a time
                </span>
              </label>
            </div>
          ) : (
            <p className="rounded-lg border border-primary/10 bg-background/60 px-3 py-3 text-sm text-primary/70">
              No published slots right now. Submit your request below and your designer will reply
              with a proposed date and time.
            </p>
          )}
        </div>

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
          disabled={
            submitting ||
            loadingAvailability ||
            (hasPublishedSlots && !selectedSlot && !flexibleTiming)
          }
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Request appointment"}
        </button>
      </form>
    </section>
  );
}
