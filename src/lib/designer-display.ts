import type { Designer } from "@/lib/mock-data";
import type { DesignerProfileMeta } from "@/lib/designer-profile-meta";

export function resolveDesignerYearsExperience(
  designer: Pick<Designer, "yearsExperience">,
  meta?: Pick<DesignerProfileMeta, "yearsExperience"> | null
): number | null {
  if (designer.yearsExperience != null && designer.yearsExperience > 0) {
    return designer.yearsExperience;
  }
  if (meta?.yearsExperience != null && meta.yearsExperience > 0) {
    return meta.yearsExperience;
  }
  return null;
}

export function formatDesignerExperience(years: number | null | undefined): string {
  if (years == null || years <= 0) return "—";
  return `${years}+ Years`;
}
