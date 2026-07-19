import type { PreferredFit } from "@/lib/measurement-sections";

export type MeasurementRecordedBy = "customer" | "designer";

export type AppointmentType =
  | "measurement"
  | "consultation"
  | "fitting"
  | "first_fitting"
  | "final_fitting"
  | "alteration"
  | "pickup";

export type AppointmentStatus =
  | "requested"
  | "confirmed"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "no_show";

export type MeetingMode =
  | "in_person"
  | "video"
  | "phone"
  | "pickup"
  | "local_delivery";

export type DeliveryMethod =
  | "customer_pickup"
  | "local_delivery"
  | "courier_delivery"
  | "designer_dropoff";

export type LocalDeliveryStatus =
  | "ready_for_pickup"
  | "pickup_scheduled"
  | "out_for_delivery"
  | "delivered"
  | "collected";

export type GroupEventType =
  | "wedding"
  | "aso-ebi"
  | "family"
  | "couples"
  | "church"
  | "birthday"
  | "other";

export type GroupOutfitStatus =
  | "pending"
  | "measured"
  | "in_production"
  | "fitting"
  | "ready"
  | "delivered";

export const APPOINTMENT_TYPE_OPTIONS: { value: AppointmentType; label: string }[] = [
  { value: "measurement", label: "Measurement" },
  { value: "consultation", label: "Consultation" },
  { value: "first_fitting", label: "First fitting" },
  { value: "final_fitting", label: "Final fitting" },
  { value: "fitting", label: "Fitting session" },
  { value: "alteration", label: "Alteration" },
  { value: "pickup", label: "Pickup" },
];

export const APPOINTMENT_STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "requested", label: "Requested" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No show" },
];

export const MEETING_MODE_OPTIONS: { value: MeetingMode; label: string }[] = [
  { value: "in_person", label: "In-person" },
  { value: "video", label: "Video call" },
  { value: "phone", label: "Phone call" },
  { value: "pickup", label: "Pickup" },
  { value: "local_delivery", label: "Local delivery" },
];

export const DELIVERY_METHOD_OPTIONS: { value: DeliveryMethod; label: string }[] = [
  { value: "customer_pickup", label: "Client Pickup" },
  { value: "local_delivery", label: "Local Delivery" },
  { value: "courier_delivery", label: "Courier Delivery" },
  { value: "designer_dropoff", label: "Designer Drop-off" },
];

export const LOCAL_DELIVERY_STATUS_OPTIONS: { value: LocalDeliveryStatus; label: string }[] = [
  { value: "ready_for_pickup", label: "Ready for Pickup" },
  { value: "pickup_scheduled", label: "Pickup Scheduled" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "collected", label: "Collected" },
];

export const GROUP_EVENT_TYPE_OPTIONS: { value: GroupEventType; label: string }[] = [
  { value: "wedding", label: "Wedding" },
  { value: "aso-ebi", label: "Aso-Ebi" },
  { value: "family", label: "Family Outfits" },
  { value: "couples", label: "Couples" },
  { value: "church", label: "Church Event" },
  { value: "birthday", label: "Birthday" },
  { value: "other", label: "Other" },
];

export const GROUP_OUTFIT_STATUS_OPTIONS: { value: GroupOutfitStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "measured", label: "Measured" },
  { value: "in_production", label: "In Production" },
  { value: "fitting", label: "Fitting" },
  { value: "ready", label: "Ready" },
  { value: "delivered", label: "Delivered" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "other", label: "Other" },
];

export interface StudioAppointment {
  id: string;
  designerId?: string;
  designerLegacyId?: string;
  designerName?: string;
  studioClientId?: string;
  studioClientName?: string;
  customerId?: string;
  customerName?: string;
  projectId?: string;
  appointmentType: AppointmentType;
  meetingMode: MeetingMode;
  status: AppointmentStatus;
  scheduledAt?: string;
  durationMinutes: number;
  locationNotes: string;
  customerNotes: string;
  designerNotes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DesignerAvailabilityDate {
  id?: string;
  availableDate: string;
  startTime: string;
  endTime: string;
}

/** @deprecated Use DesignerAvailabilityDate — kept for migration reads */
export interface DesignerAvailabilityWindow {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface DesignerAvailabilitySettings {
  slotMinutes: number;
  offeredMeetingModes: MeetingMode[];
  dates: DesignerAvailabilityDate[];
}

export interface GroupProject {
  id: string;
  title: string;
  eventType: GroupEventType;
  eventDate: string;
  notes: string;
  memberCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupProjectMember {
  id: string;
  groupProjectId: string;
  studioClientId?: string;
  customerId?: string;
  memberName: string;
  outfitStatus: GroupOutfitStatus;
  unit: "inches" | "cm";
  preferredFit: PreferredFit;
  measurementValues: Record<string, string>;
  measurementRecordedBy: MeasurementRecordedBy;
  totalPrice?: number;
  depositPaid?: number;
  paymentMethod: string;
  paymentNotes: string;
  notes: string;
}

export interface ProjectLocalOps {
  studioClientId?: string;
  groupProjectId?: string;
  deliveryMethod?: DeliveryMethod;
  localDeliveryStatus?: LocalDeliveryStatus;
  firstFittingAt?: string;
  secondFittingAt?: string;
  finalFittingAt?: string;
  fittingNotes?: string;
  adjustmentNotes?: string;
  totalPrice?: number;
  depositPaid?: number;
  paymentMethod?: string;
  paymentNotes?: string;
  measurementRecordedBy?: MeasurementRecordedBy;
}

export function formatRecordedBy(recordedBy?: MeasurementRecordedBy) {
  if (recordedBy === "designer") return "Recorded by designer";
  if (recordedBy === "customer") return "Submitted by client";
  return "Not recorded yet";
}

export function computeBalanceRemaining(totalPrice?: number, depositPaid?: number) {
  if (totalPrice == null) return undefined;
  const deposit = depositPaid ?? 0;
  return Math.max(0, totalPrice - deposit);
}

export function formatAppointmentType(type: AppointmentType) {
  return APPOINTMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function formatAppointmentStatus(status: AppointmentStatus) {
  return APPOINTMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function isPendingCustomerRequest(appointment: StudioAppointment) {
  return appointment.status === "requested";
}

export function toLocalDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function filterAppointmentsForDay(
  appointments: StudioAppointment[],
  dayKey: string
): StudioAppointment[] {
  return appointments
    .filter((appointment) => {
      if (!appointment.scheduledAt) return false;
      if (appointment.status === "cancelled") return false;
      return toLocalDateKey(appointment.scheduledAt) === dayKey;
    })
    .sort(
      (a, b) =>
        new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime()
    );
}

export function groupAppointmentsByDay(appointments: StudioAppointment[]) {
  const unscheduled: StudioAppointment[] = [];
  const groups = new Map<string, StudioAppointment[]>();

  for (const appointment of appointments) {
    if (!appointment.scheduledAt) {
      unscheduled.push(appointment);
      continue;
    }
    const dayKey = toLocalDateKey(appointment.scheduledAt);
    const current = groups.get(dayKey) ?? [];
    current.push(appointment);
    groups.set(dayKey, current);
  }

  const scheduled = [...groups.entries()]
    .map(([dayKey, items]) => ({
      dayKey,
      items: items.sort(
        (a, b) =>
          new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime()
      ),
    }))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey));

  return { unscheduled, scheduled };
}

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function formatDayKeyLabel(dayKey: string) {
  if (dayKey === "unscheduled") return "Flexible requests";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) return dayKey;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const weekday = WEEKDAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  const monthName = MONTH_NAMES[month - 1];

  return `${weekday}, ${day} ${monthName} ${year}`;
}

export function getDefaultAppointmentDayKey(appointments: StudioAppointment[]) {
  const today = toLocalDateKey(new Date());
  if (filterAppointmentsForDay(appointments, today).length > 0) {
    return today;
  }

  const scheduledDays = [
    ...new Set(
      appointments
        .filter(
          (appointment) =>
            appointment.scheduledAt && !["cancelled"].includes(appointment.status)
        )
        .map((appointment) => toLocalDateKey(appointment.scheduledAt!))
    ),
  ].sort();

  const nextDay = scheduledDays.find((day) => day >= today);
  if (nextDay) return nextDay;

  return scheduledDays.at(-1) ?? today;
}

export function formatAppointmentSourceLabel(appointment: StudioAppointment) {
  if (isPendingCustomerRequest(appointment)) {
    return "Flexible request — awaiting your response";
  }
  if (appointment.studioClientId) {
    return "Scheduled by you · walk-in client";
  }
  if (appointment.customerId) {
    return appointment.customerNotes.trim()
      ? "Booked by client"
      : "Scheduled by you · app client";
  }
  return "Scheduled appointment";
}

export function formatMeetingMode(mode: MeetingMode) {
  return MEETING_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode;
}

export interface ProjectLocalOpsFields {
  firstFittingAt?: string;
  secondFittingAt?: string;
  finalFittingAt?: string;
  fittingNotes?: string;
  adjustmentNotes?: string;
  deliveryMethod?: DeliveryMethod;
  localDeliveryStatus?: LocalDeliveryStatus;
  totalPrice?: number;
  depositPaid?: number;
  paymentMethod?: string;
  paymentNotes?: string;
}

export function formatFittingDate(value?: string) {
  if (!value?.trim()) return "Not scheduled";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDeliveryMethodLabel(value?: DeliveryMethod | string) {
  if (!value) return "Not set";
  return DELIVERY_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatLocalDeliveryStatusLabel(value?: LocalDeliveryStatus | string) {
  if (!value) return "Not set";
  return LOCAL_DELIVERY_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatPaymentMethodLabel(value?: string) {
  if (!value?.trim()) return "Not specified";
  return PAYMENT_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function hasFittingScheduleData(project: ProjectLocalOpsFields) {
  return Boolean(
    project.firstFittingAt?.trim() ||
      project.secondFittingAt?.trim() ||
      project.finalFittingAt?.trim() ||
      project.fittingNotes?.trim() ||
      project.adjustmentNotes?.trim()
  );
}

export function hasDeliveryData(project: ProjectLocalOpsFields) {
  return Boolean(project.deliveryMethod || project.localDeliveryStatus);
}

export function hasPaymentData(project: ProjectLocalOpsFields) {
  return Boolean(
    project.totalPrice != null ||
      project.depositPaid != null ||
      project.paymentMethod?.trim() ||
      project.paymentNotes?.trim()
  );
}

export function hasVisibleLocalOps(project: ProjectLocalOpsFields) {
  return hasFittingScheduleData(project) || hasDeliveryData(project) || hasPaymentData(project);
}
