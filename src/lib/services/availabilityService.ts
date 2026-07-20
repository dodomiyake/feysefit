import { createClient } from "@/lib/supabase/client";
import { isSupabaseEnabled } from "@/lib/config/backend";
import type {
  DesignerAvailabilityDate,
  DesignerAvailabilitySettings,
  MeetingMode,
} from "@/lib/local-customer";
import { localDateKey, type SlotBookingConflict } from "@/lib/appointment-slots";
import { resolveDesignerProfileId } from "@/lib/services/designerService";
import { toUserFacingSupabaseError } from "@/lib/supabase-errors";

const STORAGE_KEY = "feysefit_designer_availability";
const HOLDS_STORAGE_KEY = "feysefit_studio_appointments";

const DEFAULT_SETTINGS: DesignerAvailabilitySettings = {
  slotMinutes: 30,
  offeredMeetingModes: ["in_person", "video", "phone"],
  dates: [],
};

function readLocal(designerLegacyId: string): DesignerAvailabilitySettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const stored = (JSON.parse(raw) as Record<string, DesignerAvailabilitySettings>)[designerLegacyId];
    if (!stored) return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      dates: stored.dates ?? [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeLocal(designerLegacyId: string, settings: DesignerAvailabilitySettings) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, DesignerAvailabilitySettings>) : {};
    parsed[designerLegacyId] = settings;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

function mapDate(row: {
  id: string;
  available_date: string;
  start_time: string;
  end_time: string;
}): DesignerAvailabilityDate {
  const availableDate = String(row.available_date).slice(0, 10);
  const startTime = row.start_time.includes("T")
    ? row.start_time.slice(11, 16)
    : row.start_time.slice(0, 5);
  const endTime = row.end_time.includes("T")
    ? row.end_time.slice(11, 16)
    : row.end_time.slice(0, 5);

  return {
    id: row.id,
    availableDate,
    startTime,
    endTime,
  };
}

function toPostgresTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

export async function getDesignerAvailability(
  designerLegacyId: string
): Promise<DesignerAvailabilitySettings> {
  if (!designerLegacyId) return DEFAULT_SETTINGS;
  if (!isSupabaseEnabled()) return readLocal(designerLegacyId);

  const designerId = await resolveDesignerProfileId(designerLegacyId);
  if (!designerId) {
    throw new Error("Could not load this designer’s calendar. Refresh and try again.");
  }

  const supabase = createClient();

  // SECURITY DEFINER RPC so linked clients always see published dates (RLS-safe).
  const { data: calendarRows, error: calendarError } = await supabase.rpc(
    "get_designer_availability_calendar",
    { target_designer_id: designerId }
  );

  if (!calendarError) {
    const rows = (calendarRows ?? []) as Array<{
      id: string;
      available_date: string;
      start_time: string;
      end_time: string;
      appointment_slot_minutes: number | null;
      offered_meeting_modes: MeetingMode[] | null;
    }>;
    const todayLocal = localDateKey();
    const futureRows = rows.filter((row) => String(row.available_date).slice(0, 10) >= todayLocal);
    const first = futureRows[0] ?? rows[0];
    return {
      slotMinutes: first?.appointment_slot_minutes ?? 30,
      offeredMeetingModes: first?.offered_meeting_modes ?? ["in_person", "video", "phone"],
      dates: futureRows.map(mapDate),
    };
  }

  // Missing RPC otherwise looks like “no slots published” — surface the fix instead.
  const rpcMessage = calendarError.message ?? "";
  if (/could not find the function|does not exist|schema cache/i.test(rpcMessage)) {
    throw new Error(toUserFacingSupabaseError(calendarError, rpcMessage));
  }

  const todayLocal = localDateKey();
  const [{ data: profile }, { data: dates, error: datesError }] = await Promise.all([
    supabase
      .from("designer_profiles")
      .select("appointment_slot_minutes, offered_meeting_modes")
      .eq("id", designerId)
      .maybeSingle(),
    supabase
      .from("designer_availability_dates")
      .select("id, available_date, start_time, end_time")
      .eq("designer_id", designerId)
      .gte("available_date", todayLocal)
      .order("available_date")
      .order("start_time"),
  ]);

  if (datesError) throw new Error(toUserFacingSupabaseError(datesError, datesError.message));

  return {
    slotMinutes: profile?.appointment_slot_minutes ?? 30,
    offeredMeetingModes: (profile?.offered_meeting_modes as MeetingMode[] | null) ?? [
      "in_person",
      "video",
      "phone",
    ],
    dates: (dates ?? []).map(mapDate),
  };
}

export async function saveDesignerAvailability(
  designerLegacyId: string,
  settings: DesignerAvailabilitySettings
): Promise<DesignerAvailabilitySettings> {
  if (!isSupabaseEnabled()) {
    writeLocal(designerLegacyId, settings);
    return settings;
  }

  const designerId = await resolveDesignerProfileId(designerLegacyId);
  if (!designerId) throw new Error("Designer not found");

  const supabase = createClient();
  const { error: profileError } = await supabase
    .from("designer_profiles")
    .update({
      appointment_slot_minutes: settings.slotMinutes,
      offered_meeting_modes: settings.offeredMeetingModes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", designerId);
  if (profileError) throw new Error(toUserFacingSupabaseError(profileError, profileError.message));

  const { error: deleteError } = await supabase
    .from("designer_availability_dates")
    .delete()
    .eq("designer_id", designerId);
  if (deleteError) throw new Error(toUserFacingSupabaseError(deleteError, deleteError.message));

  if (settings.dates.length) {
    const { error: insertError } = await supabase.from("designer_availability_dates").insert(
      settings.dates.map((entry) => ({
        designer_id: designerId,
        available_date: entry.availableDate,
        start_time: toPostgresTime(entry.startTime),
        end_time: toPostgresTime(entry.endTime),
      }))
    );
    if (insertError) throw new Error(toUserFacingSupabaseError(insertError, insertError.message));
  }

  return getDesignerAvailability(designerLegacyId);
}

export async function listDesignerBookedSlots(
  designerLegacyId: string
): Promise<SlotBookingConflict[]> {
  if (!designerLegacyId) return [];

  if (!isSupabaseEnabled()) {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(HOLDS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Record<
        string,
        Array<{ scheduledAt?: string; durationMinutes?: number; status: string }>
      >;
      const items = parsed[designerLegacyId] ?? [];
      return items
        .filter(
          (item) =>
            item.scheduledAt &&
            ["requested", "confirmed", "rescheduled"].includes(item.status)
        )
        .map((item) => ({
          scheduledAt: item.scheduledAt,
          durationMinutes: item.durationMinutes ?? 30,
          status: item.status,
        }));
    } catch {
      return [];
    }
  }

  const designerId = await resolveDesignerProfileId(designerLegacyId);
  if (!designerId) return [];

  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_designer_appointment_holds", {
    target_designer_id: designerId,
  });

  if (error) {
    // Holds are best-effort — missing RPC/table must not hide published open dates.
    const { data: fallback, error: fallbackError } = await supabase
      .from("studio_appointments")
      .select("scheduled_at, duration_minutes, status")
      .eq("designer_id", designerId)
      .in("status", ["requested", "confirmed", "rescheduled"])
      .not("scheduled_at", "is", null);

    if (fallbackError) {
      console.error("Could not load appointment holds", fallbackError);
      return [];
    }
    return (fallback ?? []).map((row) => ({
      scheduledAt: row.scheduled_at ?? undefined,
      durationMinutes: row.duration_minutes,
      status: row.status,
    }));
  }

  return (data ?? []).map(
    (row: { scheduled_at: string; duration_minutes: number; status: string }) => ({
      scheduledAt: row.scheduled_at,
      durationMinutes: row.duration_minutes,
      status: row.status,
    })
  );
}
