import type {
  AppointmentStatus,
  DesignerAvailabilityDate,
} from "@/lib/local-customer";

const ACTIVE_STATUSES: AppointmentStatus[] = ["requested", "confirmed", "rescheduled"];

export interface SlotBookingConflict {
  scheduledAt?: string;
  durationMinutes: number;
  status: AppointmentStatus | string;
}

function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

function formatSlotLabel(date: Date) {
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function overlaps(
  slotStart: number,
  slotEnd: number,
  appointmentStart: number,
  appointmentEnd: number
) {
  return slotStart < appointmentEnd && slotEnd > appointmentStart;
}

function isSlotBlocked(
  slotStart: number,
  slotEnd: number,
  existingAppointments: SlotBookingConflict[]
) {
  return existingAppointments.some((appointment) => {
    if (!ACTIVE_STATUSES.includes(appointment.status as AppointmentStatus) || !appointment.scheduledAt) {
      return false;
    }
    const appointmentStart = new Date(appointment.scheduledAt).getTime();
    const appointmentEnd = appointmentStart + appointment.durationMinutes * 60_000;
    return overlaps(slotStart, slotEnd, appointmentStart, appointmentEnd);
  });
}

export function generateAvailableSlots(input: {
  dates: DesignerAvailabilityDate[];
  slotMinutes: number;
  existingAppointments: SlotBookingConflict[];
  now?: Date;
}) {
  const { dates, slotMinutes, existingAppointments, now = new Date() } = input;

  if (!dates.length || slotMinutes <= 0) return [];

  const slots: { iso: string; label: string }[] = [];
  const sortedDates = [...dates].sort((a, b) => a.availableDate.localeCompare(b.availableDate));

  for (const entry of sortedDates) {
    const [year, month, day] = entry.availableDate.split("-").map(Number);
    if (!year || !month || !day) continue;

    const windowStart = parseTimeToMinutes(entry.startTime);
    const windowEnd = parseTimeToMinutes(entry.endTime);

    for (let minute = windowStart; minute + slotMinutes <= windowEnd; minute += slotMinutes) {
      const slotDate = new Date(year, month - 1, day, Math.floor(minute / 60), minute % 60, 0, 0);
      if (slotDate.getTime() <= now.getTime()) continue;

      const slotStart = slotDate.getTime();
      const slotEnd = slotStart + slotMinutes * 60_000;
      if (isSlotBlocked(slotStart, slotEnd, existingAppointments)) continue;

      slots.push({
        iso: slotDate.toISOString(),
        label: formatSlotLabel(slotDate),
      });
    }
  }

  return slots;
}

export function slotConflictsWithHolds(
  scheduledAt: string,
  durationMinutes: number,
  existingAppointments: SlotBookingConflict[]
) {
  const slotStart = new Date(scheduledAt).getTime();
  const slotEnd = slotStart + durationMinutes * 60_000;
  return isSlotBlocked(slotStart, slotEnd, existingAppointments);
}

export function isWithinPublishedAvailability(
  dates: DesignerAvailabilityDate[],
  scheduledAt: string,
  durationMinutes: number
) {
  const slotStart = new Date(scheduledAt);
  const dateKey = [
    slotStart.getFullYear(),
    String(slotStart.getMonth() + 1).padStart(2, "0"),
    String(slotStart.getDate()).padStart(2, "0"),
  ].join("-");

  const entry = dates.find((item) => item.availableDate === dateKey);
  if (!entry) return false;

  const startMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
  const endMinutes = startMinutes + durationMinutes;
  const windowStart = parseTimeToMinutes(entry.startTime);
  const windowEnd = parseTimeToMinutes(entry.endTime);

  return startMinutes >= windowStart && endMinutes <= windowEnd;
}

export function groupSlotsByDate(slots: { iso: string; label: string }[]) {
  const groups = new Map<string, { iso: string; label: string }[]>();
  for (const slot of slots) {
    const dateKey = new Date(slot.iso).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const current = groups.get(dateKey) ?? [];
    current.push(slot);
    groups.set(dateKey, current);
  }
  return Array.from(groups.entries());
}

export function formatAvailabilityDateLabel(availableDate: string) {
  const parsed = new Date(`${availableDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return availableDate;
  return parsed.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
