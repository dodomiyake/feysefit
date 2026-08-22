export const DESIGNER_SERVICE_AREA_OPTIONS = [
  "Local fittings",
  "Nationwide delivery",
  "International shipping",
  "Virtual consultations",
] as const;

export type DesignerServiceArea = (typeof DESIGNER_SERVICE_AREA_OPTIONS)[number];

const SERVICE_AREA_PATTERN = DESIGNER_SERVICE_AREA_OPTIONS.map(escapeRegExp).join("|");
const SERVICE_AREAS_SUFFIX = new RegExp(
  `(?:\\n\\n)?Service areas: ((?:${SERVICE_AREA_PATTERN})(?:, (?:${SERVICE_AREA_PATTERN}))*)\\s*$`
);
const CONTACT_SUFFIX = /(?:\n\n)?Contact: ([^\n]*\d[^\n]*)\s*$/;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeDesignerServiceAreas(values: string[] | null | undefined): string[] {
  const allowed = new Set<string>(DESIGNER_SERVICE_AREA_OPTIONS);
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of values ?? []) {
    const trimmed = value.trim();
    if (!trimmed || !allowed.has(trimmed) || seen.has(trimmed)) continue;
    seen.add(trimmed);
    next.push(trimmed);
  }
  return next;
}

/**
 * Splits the generated onboarding suffix off a biography.
 * Only trailing `Contact:` / `Service areas:` blocks that match the saved
 * format are removed — in-body mentions stay intact.
 */
export function splitGeneratedDesignerBio(raw: string | null | undefined): {
  bio: string;
  phone: string;
  serviceAreas: string[];
} {
  let bio = (raw ?? "").replace(/\r\n/g, "\n").trimEnd();
  let phone = "";
  let serviceAreas: string[] = [];

  const serviceMatch = bio.match(SERVICE_AREAS_SUFFIX);
  if (serviceMatch?.index != null) {
    serviceAreas = normalizeDesignerServiceAreas(serviceMatch[1]?.split(", "));
    bio = bio.slice(0, serviceMatch.index).trimEnd();
  }

  const contactMatch = bio.match(CONTACT_SUFFIX);
  if (contactMatch?.index != null) {
    phone = contactMatch[1]?.trim() ?? "";
    bio = bio.slice(0, contactMatch.index).trimEnd();
  }

  return { bio: bio.trim(), phone, serviceAreas };
}

/** Fields written at registration / profile edit — never concatenated into bio. */
export function structuredDesignerStoryFields(input: {
  bio: string;
  phone: string;
  serviceAreas: string[];
  tagline?: string;
}) {
  return {
    bio: input.bio.trim(),
    phone: input.phone.trim(),
    serviceAreas: normalizeDesignerServiceAreas(input.serviceAreas),
    tagline: input.tagline?.trim() ?? "",
  };
}
