const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True when the value is a canonical UUID (safe for uuid column filters). */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * PostgREST `.or()` filter for rows keyed by legacy_id and/or uuid id.
 * Avoids `id.eq.<legacy>` which Postgres rejects for uuid columns.
 */
export function legacyOrIdFilter(legacyOrId: string): string {
  if (isUuid(legacyOrId)) {
    return `legacy_id.eq.${legacyOrId},id.eq.${legacyOrId}`;
  }
  return `legacy_id.eq.${legacyOrId}`;
}
