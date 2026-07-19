export interface ProjectPalette {
  id: string;
  projectCode: string;
  name: string;
  colors: [string, string, string, string];
  labels: [string, string, string, string];
}

export const projectPalettes: Record<string, ProjectPalette> = {
  "silk-gala-gown": {
    id: "silk-gala-gown",
    projectCode: "FF-2024-082",
    name: "Silk Gala Gown",
    colors: ["#1E1E24", "#6E44FF", "#B892FF", "#FFC2E2"],
    labels: ["Licorice", "Slate Blue", "Lavender Blue", "Soft Pink"],
  },
  "silk-aso-ebi": {
    id: "silk-aso-ebi",
    projectCode: "FF-2024-091",
    name: "Silk Aso-Ebi Gown",
    colors: ["#D45B12", "#ECA72C", "#2F1B25", "#F7F5FB"],
    labels: ["Burnt Orange", "Saffron", "Dark Plum", "Lavender Mist"],
  },
};

export function getProjectPalette(paletteId: string): ProjectPalette | undefined {
  return projectPalettes[paletteId];
}

export function getPaletteForProjectCode(code: string): ProjectPalette | undefined {
  return Object.values(projectPalettes).find((p) => p.projectCode === code);
}
