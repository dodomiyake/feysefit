const SCHEMA_HINTS: Array<{ match: RegExp; hint: string }> = [
  {
    match: /designer_availability_dates/i,
    hint: "Run supabase/patch-appointment-dates.sql in the Supabase SQL Editor (or the full patch-appointments-setup.sql bundle).",
  },
  {
    match: /get_designer_availability_calendar/i,
    hint: "Run supabase/patch-availability-calendar-rpc.sql in the Supabase SQL Editor.",
  },
  {
    match: /get_designer_appointment_holds/i,
    hint: "Run supabase/patch-appointment-dates.sql in the Supabase SQL Editor.",
  },
  {
    match: /meeting_mode/i,
    hint: "Run supabase/patch-appointment-model.sql in the Supabase SQL Editor.",
  },
  {
    match: /studio_appointments/i,
    hint: "Run supabase/patch-appointments-setup.sql in the Supabase SQL Editor.",
  },
  {
    match: /customer_may_book_designer/i,
    hint: "Run supabase/patch-appointment-model.sql in the Supabase SQL Editor.",
  },
  {
    match: /appointment_slot_minutes|offered_meeting_modes/i,
    hint: "Run supabase/patch-appointment-model.sql in the Supabase SQL Editor.",
  },
  {
    match:
      /designer_profiles\.(tagline|phone|service_areas)|could not find the '(tagline|phone|service_areas)' column|column .*?(tagline|service_areas|designer_profiles\.phone).*does not exist/i,
    hint: "Run supabase/patch-designer-contact-service-areas.sql in the Supabase SQL Editor.",
  },
];

export function formatSupabaseSchemaError(message: string): string | null {
  for (const { match, hint } of SCHEMA_HINTS) {
    if (match.test(message)) {
      return `Database update required. ${hint}`;
    }
  }

  if (/schema cache|could not find the table/i.test(message)) {
    return `Database update required. Run supabase/patch-appointments-setup.sql in the Supabase SQL Editor, then try again.`;
  }

  return null;
}

export function toUserFacingSupabaseError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  return formatSupabaseSchemaError(message) ?? message;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Log PostgREST/Supabase failures with code, details, and hint in development. */
export function logDevSupabaseError(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (isRecord(error) && ("message" in error || "code" in error)) {
    console.error(context, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return;
  }
  console.error(context, error);
}
