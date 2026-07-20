import { createClient } from "@/lib/supabase/client";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import type {
  AppointmentStatus,
  AppointmentType,
  MeetingMode,
  StudioAppointment,
} from "@/lib/local-customer";
import { formatAppointmentStatus, formatAppointmentType } from "@/lib/local-customer";
import {
  isWithinPublishedAvailability,
  slotConflictsWithHolds,
} from "@/lib/appointment-slots";
import {
  getDesignerAvailability,
  listDesignerBookedSlots,
} from "@/lib/services/availabilityService";
import { resolveCustomerProfileId } from "@/lib/services/customerService";
import { resolveDesignerProfileId } from "@/lib/services/designerService";
import { notifyDesignerOnCustomerActivity } from "@/lib/services/projectService";
import { toUserFacingSupabaseError } from "@/lib/supabase-errors";
import type { DbStudioAppointment } from "@/lib/types/database";

const STORAGE_KEY = "feysefit_studio_appointments";

async function resolveCustomerDisplayName(customerLegacyId: string) {
  if (!isSupabaseEnabled()) return "Client";
  const profileId = await resolveCustomerProfileId(customerLegacyId);
  if (!profileId) return "Client";
  const supabase = createClient();
  const { data } = await supabase
    .from("customer_profiles")
    .select("name")
    .eq("id", profileId)
    .maybeSingle();
  return data?.name?.trim() || "Client";
}

function formatAppointmentWhen(scheduledAt?: string) {
  if (!scheduledAt) return null;
  return new Date(scheduledAt).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapRow(
  row: DbStudioAppointment,
  names?: {
    studioClientName?: string;
    customerName?: string;
    designerLegacyId?: string;
    designerName?: string;
  }
): StudioAppointment {
  return {
    id: row.legacy_id ?? row.id,
    designerId: row.designer_id,
    designerLegacyId: names?.designerLegacyId,
    designerName: names?.designerName,
    studioClientId: row.studio_client_id ?? undefined,
    studioClientName: names?.studioClientName,
    customerId: row.customer_id ?? undefined,
    customerName: names?.customerName,
    projectId: row.project_id ?? undefined,
    appointmentType: row.appointment_type as AppointmentType,
    meetingMode: (row.meeting_mode as MeetingMode | undefined) ?? "in_person",
    status: row.status as AppointmentStatus,
    scheduledAt: row.scheduled_at ?? undefined,
    durationMinutes: row.duration_minutes,
    locationNotes: row.location_notes,
    customerNotes: row.customer_notes,
    designerNotes: row.designer_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function readLocal(designerLegacyId: string): StudioAppointment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Record<string, StudioAppointment[]>)[designerLegacyId] ?? [];
  } catch {
    return [];
  }
}

function writeLocal(designerLegacyId: string, items: StudioAppointment[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, StudioAppointment[]>) : {};
    parsed[designerLegacyId] = items;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

async function resolveDesignerId(designerLegacyId: string) {
  const profileId = await resolveDesignerProfileId(designerLegacyId);
  if (!profileId) throw new Error("Designer profile not found");
  return profileId;
}

export async function listAppointmentsForDesigner(
  designerLegacyId: string
): Promise<StudioAppointment[]> {
  if (!designerLegacyId) return [];
  if (!isSupabaseEnabled()) return readLocal(designerLegacyId);

  const designerId = await resolveDesignerProfileId(designerLegacyId);
  if (!designerId) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("studio_appointments")
    .select(
      `
        *,
        studio_clients ( name ),
        customer_profiles ( name )
      `
    )
    .eq("designer_id", designerId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(toUserFacingSupabaseError(error, error.message));

  return (data ?? []).map((row) => {
    const appointment = row as unknown as DbStudioAppointment & {
      studio_clients?: { name: string } | null;
      customer_profiles?: { name: string } | null;
    };
    return mapRow(appointment, {
      studioClientName: appointment.studio_clients?.name,
      customerName: appointment.customer_profiles?.name,
    });
  });
}

export async function listAllAppointmentsForAdmin(): Promise<StudioAppointment[]> {
  if (!isSupabaseEnabled()) return [];

  const supabase = createClient();
  const [{ data: appointments, error }, { data: designers, error: designersError }] =
    await Promise.all([
      supabase
        .from("studio_appointments")
        .select("*")
        .order("scheduled_at", { ascending: false, nullsFirst: false }),
      supabase.from("designer_profiles").select("id, legacy_id, business_name"),
    ]);
  if (error) throw new Error(toUserFacingSupabaseError(error, error.message));
  if (designersError) throw new Error(designersError.message);

  const rows = appointments ?? [];
  const studioClientIds = [
    ...new Set(rows.map((row) => row.studio_client_id).filter(Boolean)),
  ] as string[];
  const customerIds = [...new Set(rows.map((row) => row.customer_id).filter(Boolean))] as string[];

  const [{ data: studioClients }, { data: customers }] = await Promise.all([
    studioClientIds.length > 0
      ? supabase.from("studio_clients").select("id, name").in("id", studioClientIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    customerIds.length > 0
      ? supabase.from("customer_profiles").select("id, name").in("id", customerIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const designerByProfileId = new Map((designers ?? []).map((row) => [row.id, row]));
  const studioClientById = new Map((studioClients ?? []).map((row) => [row.id, row]));
  const customerById = new Map((customers ?? []).map((row) => [row.id, row]));

  return rows.map((row) => {
    const designer = designerByProfileId.get(row.designer_id);
    const designerKey = designer?.legacy_id ?? row.designer_id;

    return mapRow(row as DbStudioAppointment, {
      studioClientName: row.studio_client_id
        ? studioClientById.get(row.studio_client_id)?.name
        : undefined,
      customerName: row.customer_id ? customerById.get(row.customer_id)?.name : undefined,
      designerLegacyId: designerKey,
      designerName: designer?.business_name,
    });
  });
}

async function validateAppointmentSlot(
  designerLegacyId: string,
  input: {
    scheduledAt?: string;
    durationMinutes?: number;
    status?: AppointmentStatus;
    customerId?: string;
    studioClientId?: string;
  }
) {
  if (!input.scheduledAt) return;

  const activeStatus = input.status ?? "confirmed";
  if (["cancelled", "completed", "no_show"].includes(activeStatus)) return;

  const scheduledMs = new Date(input.scheduledAt).getTime();
  if (Number.isNaN(scheduledMs) || scheduledMs <= Date.now()) {
    throw new Error("Choose a future date and time for your appointment.");
  }

  const durationMinutes = input.durationMinutes ?? 60;
  const holds = await listDesignerBookedSlots(designerLegacyId);

  if (slotConflictsWithHolds(input.scheduledAt, durationMinutes, holds)) {
    throw new Error("This time slot is no longer available");
  }

  const isCustomerInitiated = Boolean(input.customerId && !input.studioClientId);
  // Flexible / proposed times from clients stay as requested and may be any free future slot.
  if (isCustomerInitiated && activeStatus === "requested") return;

  // Instant confirmed bookings must land inside a published open window.
  if (!(isCustomerInitiated && activeStatus === "confirmed")) return;

  const availability = await getDesignerAvailability(designerLegacyId);
  if (!availability.dates.length) {
    throw new Error("Your designer has not published any available dates yet");
  }

  if (!isWithinPublishedAvailability(availability.dates, input.scheduledAt, durationMinutes)) {
    throw new Error("Please choose one of your designer's published time slots");
  }
}

export async function createAppointment(
  designerLegacyId: string,
  input: {
    studioClientId?: string;
    customerId?: string;
    projectId?: string;
    appointmentType: AppointmentType;
    meetingMode?: MeetingMode;
    scheduledAt?: string;
    durationMinutes?: number;
    locationNotes?: string;
    customerNotes?: string;
    designerNotes?: string;
    status?: AppointmentStatus;
  }
): Promise<StudioAppointment> {
  const legacyId = `apt-${Date.now().toString(36)}`;
  const status =
    input.status ??
    (input.customerId && input.customerNotes !== undefined ? "requested" : "confirmed");

  await validateAppointmentSlot(designerLegacyId, {
    scheduledAt: input.scheduledAt,
    durationMinutes: input.durationMinutes,
    status,
    customerId: input.customerId,
    studioClientId: input.studioClientId,
  });

  if (!isSupabaseEnabled()) {
    const appointment: StudioAppointment = {
      id: legacyId,
      studioClientId: input.studioClientId,
      customerId: input.customerId,
      projectId: input.projectId,
      appointmentType: input.appointmentType,
      meetingMode: input.meetingMode ?? "in_person",
      status,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes ?? 60,
      locationNotes: input.locationNotes?.trim() ?? "",
      customerNotes: input.customerNotes?.trim() ?? "",
      designerNotes: input.designerNotes?.trim() ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const current = readLocal(designerLegacyId);
    writeLocal(designerLegacyId, [appointment, ...current]);
    return appointment;
  }

  const designerId = await resolveDesignerId(designerLegacyId);
  let studioClientUuid: string | null = null;
  let customerUuid: string | null = null;

  if (input.studioClientId) {
    const supabase = createClient();
    const { data } = await supabase
      .from("studio_clients")
      .select("id")
      .or(legacyOrIdFilter(input.studioClientId))
      .maybeSingle();
    studioClientUuid = data?.id ?? null;
  }
  if (input.customerId) {
    customerUuid = await resolveCustomerProfileId(input.customerId);
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("studio_appointments")
    .insert({
      legacy_id: legacyId,
      designer_id: designerId,
      studio_client_id: studioClientUuid,
      customer_id: customerUuid,
      project_id: input.projectId ?? null,
      appointment_type: input.appointmentType,
      meeting_mode: input.meetingMode ?? "in_person",
      status,
      scheduled_at: input.scheduledAt ?? null,
      duration_minutes: input.durationMinutes ?? 60,
      location_notes: input.locationNotes?.trim() ?? "",
      customer_notes: input.customerNotes?.trim() ?? "",
      designer_notes: input.designerNotes?.trim() ?? "",
    })
    .select("*")
    .single();
  if (error) throw new Error(toUserFacingSupabaseError(error, error.message));

  const isCustomerInitiated =
    Boolean(input.customerId) && input.customerNotes !== undefined;

  if (status === "requested" && isCustomerInitiated && input.customerId) {
    const type = formatAppointmentType(input.appointmentType).toLowerCase();
    const note = input.customerNotes?.trim();
    let message = `New ${type} appointment request (time flexible). Review in Appointments.`;
    if (note) message += ` Reason: ${note}`;
    try {
      await notifyDesignerOnCustomerActivity(input.customerId, message);
    } catch (notifyError) {
      console.error("Could not notify designer of appointment request", notifyError);
    }
  } else if (
    status === "confirmed" &&
    isCustomerInitiated &&
    input.customerId &&
    input.scheduledAt
  ) {
    const customerName = await resolveCustomerDisplayName(input.customerId);
    const type = formatAppointmentType(input.appointmentType).toLowerCase();
    const when = formatAppointmentWhen(input.scheduledAt);
    const note = input.customerNotes?.trim();
    let message = `${customerName} booked a ${type} for ${when}.`;
    if (note) message += ` Reason: ${note}`;
    message += " View in Appointments.";
    try {
      await notifyDesignerOnCustomerActivity(input.customerId, message);
    } catch (notifyError) {
      console.error("Could not notify designer of appointment booking", notifyError);
    }
  }

  if (data.customer_id) {
    await notifyCustomerOfAppointment(data as DbStudioAppointment, status);
  }

  return mapRow(data as DbStudioAppointment);
}

export async function requestCustomerAppointment(
  customerLegacyId: string,
  designerLegacyId: string,
  input: {
    appointmentType: AppointmentType;
    meetingMode?: MeetingMode;
    scheduledAt?: string;
    customerNotes?: string;
    projectId?: string;
    durationMinutes?: number;
  }
) {
  let status: AppointmentStatus = "requested";
  if (input.scheduledAt) {
    const availability = await getDesignerAvailability(designerLegacyId);
    const durationMinutes = input.durationMinutes ?? availability.slotMinutes ?? 30;
    const withinPublished =
      availability.dates.length > 0 &&
      isWithinPublishedAvailability(availability.dates, input.scheduledAt, durationMinutes);
    const holds = await listDesignerBookedSlots(designerLegacyId);
    const free = !slotConflictsWithHolds(input.scheduledAt, durationMinutes, holds);
    if (withinPublished && free) {
      status = "confirmed";
    }
  }

  return createAppointment(designerLegacyId, {
    customerId: customerLegacyId,
    projectId: input.projectId,
    appointmentType: input.appointmentType,
    meetingMode: input.meetingMode,
    scheduledAt: input.scheduledAt,
    customerNotes: input.customerNotes,
    durationMinutes: input.durationMinutes,
    status,
  });
}

export async function listAppointmentsForCustomer(
  customerLegacyId: string
): Promise<StudioAppointment[]> {
  if (!customerLegacyId) return [];

  if (!isSupabaseEnabled()) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Record<string, StudioAppointment[]>;
      return Object.values(parsed)
        .flat()
        .filter((item) => item.customerId === customerLegacyId)
        .sort((a, b) => {
          const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
          const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
          return bTime - aTime;
        });
    } catch {
      return [];
    }
  }

  const customerId = await resolveCustomerProfileId(customerLegacyId);
  if (!customerId) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("studio_appointments")
    .select("*")
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(toUserFacingSupabaseError(error, error.message));
  return (data ?? []).map((row) => mapRow(row as DbStudioAppointment));
}

function formatAppointmentCustomerMessage(
  row: DbStudioAppointment,
  status: AppointmentStatus
) {
  const type = formatAppointmentType(row.appointment_type as AppointmentType).toLowerCase();
  const when = row.scheduled_at
    ? new Date(row.scheduled_at).toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const note = row.location_notes?.trim() || row.designer_notes?.trim();

  if (status === "confirmed") {
    let message = when
      ? `Your designer scheduled a ${type} for ${when}.`
      : `Your designer scheduled a ${type} appointment.`;
    if (note) message += ` ${note}`;
    return `${message} View details on My Designer.`;
  }

  if (status === "requested") {
    return when
      ? `Your ${type} request for ${when} was sent. Your designer will confirm soon.`
      : `Your ${type} request was sent. Your designer will confirm soon.`;
  }

  if (status === "rescheduled") {
    let message = when
      ? `Your ${type} was moved to ${when}.`
      : `Your ${type} was rescheduled.`;
    if (note) message += ` ${note}`;
    return `${message} View details on My Designer.`;
  }

  const label = formatAppointmentStatus(status).toLowerCase();
  return when
    ? `Your ${type} on ${when} is now ${label}. View details on My Designer.`
    : `Your ${type} appointment is now ${label}. View details on My Designer.`;
}

async function notifyCustomerOfAppointment(
  appointmentRow: DbStudioAppointment,
  status: AppointmentStatus
) {
  if (!appointmentRow.customer_id || !isSupabaseEnabled()) return;

  const supabase = createClient();
  const message = formatAppointmentCustomerMessage(appointmentRow, status);
  const nowLabel = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  let projectId = appointmentRow.project_id ?? null;
  if (!projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("customer_id", appointmentRow.customer_id)
      .eq("designer_id", appointmentRow.designer_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    projectId = project?.id ?? null;
  }

  if (!projectId) return;

  const { error } = await supabase
    .from("projects")
    .update({
      customer_update: message,
      last_updated: nowLabel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) {
    console.error("Could not notify customer of appointment", error.message);
  }
}

export async function updateAppointmentStatus(
  designerLegacyId: string,
  appointmentId: string,
  patch: {
    status?: AppointmentStatus;
    scheduledAt?: string;
    designerNotes?: string;
    durationMinutes?: number;
    locationNotes?: string;
  }
): Promise<StudioAppointment> {
  const now = new Date().toISOString();

  if (!isSupabaseEnabled()) {
    const current = readLocal(designerLegacyId);
    const index = current.findIndex((item) => item.id === appointmentId);
    if (index < 0) throw new Error("Appointment not found");
    const next = {
      ...current[index],
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.scheduledAt !== undefined ? { scheduledAt: patch.scheduledAt } : {}),
      ...(patch.designerNotes !== undefined ? { designerNotes: patch.designerNotes.trim() } : {}),
      ...(patch.durationMinutes !== undefined ? { durationMinutes: patch.durationMinutes } : {}),
      ...(patch.locationNotes !== undefined ? { locationNotes: patch.locationNotes.trim() } : {}),
      updatedAt: now,
    };
    current[index] = next;
    writeLocal(designerLegacyId, current);
    return next;
  }

  const supabase = createClient();
  const { data: existing, error: lookupError } = await supabase
    .from("studio_appointments")
    .select("*")
    .or(legacyOrIdFilter(appointmentId))
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!existing) throw new Error("Appointment not found");

  const { data, error } = await supabase
    .from("studio_appointments")
    .update({
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.scheduledAt !== undefined ? { scheduled_at: patch.scheduledAt } : {}),
      ...(patch.designerNotes !== undefined ? { designer_notes: patch.designerNotes.trim() } : {}),
      ...(patch.durationMinutes !== undefined ? { duration_minutes: patch.durationMinutes } : {}),
      ...(patch.locationNotes !== undefined ? { location_notes: patch.locationNotes.trim() } : {}),
      updated_at: now,
    })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw new Error(toUserFacingSupabaseError(error, error.message));

  const shouldNotifyCustomer = Boolean(
    existing.customer_id && (patch.status !== undefined || patch.scheduledAt !== undefined)
  );
  if (shouldNotifyCustomer) {
    await notifyCustomerOfAppointment(
      data as DbStudioAppointment,
      (patch.status ?? existing.status) as AppointmentStatus
    );
  }

  return mapRow(data as DbStudioAppointment);
}
