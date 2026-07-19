export interface FabricOption {
  value: string;
  label: string;
}

export const PRIMARY_FABRIC_OPTIONS: FabricOption[] = [
  { value: "Italian silk charmeuse", label: "Italian silk charmeuse" },
  { value: "Duchess satin", label: "Duchess satin" },
  { value: "Premium silk blend", label: "Premium silk blend" },
  { value: "Brocade", label: "Brocade" },
  { value: "Lace overlay", label: "Lace overlay" },
  { value: "Crepe", label: "Crepe" },
  { value: "Velvet", label: "Velvet" },
  { value: "Ankara / wax print", label: "Ankara / wax print" },
];

export const SECONDARY_MATERIAL_OPTIONS: FabricOption[] = [
  { value: "Embroidery & beadwork", label: "Embroidery & beadwork" },
  { value: "Sequin trim", label: "Sequin trim" },
  { value: "Lace appliqué", label: "Lace appliqué" },
  { value: "Contrast binding", label: "Contrast binding" },
  { value: "Feather trim", label: "Feather trim" },
  { value: "None — primary fabric only", label: "None — primary fabric only" },
];

export const LINING_OPTIONS: FabricOption[] = [
  { value: "Silk organza", label: "Silk organza" },
  { value: "Cotton sateen", label: "Cotton sateen" },
  { value: "Bemberg cupro", label: "Bemberg cupro" },
  { value: "Stretch mesh", label: "Stretch mesh" },
  { value: "Unlined", label: "Unlined" },
];

export const FABRIC_CUSTOM_VALUE = "__custom__";

export function resolveFabricSelectValue(
  current: string | undefined,
  options: FabricOption[]
): { selectValue: string; customText: string } {
  const trimmed = current?.trim() ?? "";
  if (!trimmed) {
    return { selectValue: "", customText: "" };
  }
  if (options.some((option) => option.value === trimmed)) {
    return { selectValue: trimmed, customText: "" };
  }
  return { selectValue: FABRIC_CUSTOM_VALUE, customText: trimmed };
}

export function resolveFabricSaveValue(selectValue: string, customText: string): string {
  if (selectValue === FABRIC_CUSTOM_VALUE) {
    return customText.trim();
  }
  return selectValue.trim();
}
