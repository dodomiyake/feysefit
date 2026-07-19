const SCHEMA_HINTS: Array<{ match: RegExp; hint: string }> = [
  {
    match: /designer_availability_dates/i,
    hint: "Run supabase/patch-appointment-dates.sql in the Supabase SQL Editor (or the full patch-appointments-setup.sql bundle).",
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
