import type { Designer } from "@/lib/mock-data";

export interface AdminDesignerScopedRow {
  designerLegacyId?: string;
  designerProfileId?: string;
  designerId?: string;
  designerName?: string;
}

export function matchesAdminDesignerFilter(
  item: AdminDesignerScopedRow,
  designerFilter: string,
  designers: Designer[]
): boolean {
  if (designerFilter === "all") return true;

  const selected = designers.find((designer) => designer.id === designerFilter);
  const itemKeys = [item.designerLegacyId, item.designerProfileId, item.designerId].filter(Boolean);
  const filterKeys = [designerFilter, selected?.id].filter(Boolean);

  if (itemKeys.some((key) => filterKeys.includes(key))) return true;

  return Boolean(
    item.designerName && selected?.businessName && item.designerName === selected.businessName
  );
}
