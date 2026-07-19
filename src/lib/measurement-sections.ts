import type { LucideIcon } from "lucide-react";
import { Accessibility, Landmark, Ruler, UserRound } from "lucide-react";

export interface MeasurementFieldDef {
  key: string;
  label: string;
  fieldNum?: string;
  helper?: string;
}

export interface MeasurementSectionDef {
  id: string;
  title: string;
  icon: LucideIcon;
  fields: MeasurementFieldDef[];
  showPreferredFit?: boolean;
}

export const measurementSections: MeasurementSectionDef[] = [
  {
    id: "general",
    title: "General",
    icon: UserRound,
    showPreferredFit: true,
    fields: [
      {
        key: "height",
        label: "Height",
        helper: "Stand straight against a wall. Measure from floor to top of head.",
      },
    ],
  },
  {
    id: "upper",
    title: "Upper Body",
    icon: Accessibility,
    fields: [
      {
        key: "chest",
        label: "Chest / Bust",
        helper: "Measure around the fullest part of your chest, keeping tape parallel to floor.",
      },
      {
        key: "shoulder",
        label: "Shoulder Width",
        helper: "From one shoulder point to the other across the back.",
      },
      {
        key: "neck",
        label: "Neck",
        helper: "Measure around the base of your neck where a collar would sit.",
      },
      {
        key: "sleeve",
        label: "Sleeve Length",
        helper: "From shoulder seam down to where you want the cuff to end.",
      },
      {
        key: "armhole",
        label: "Armhole",
        helper: "Measure around your shoulder and underarm in a circle.",
      },
      {
        key: "wrist",
        label: "Wrist",
        helper: "Measure around your wrist where a cuff would sit.",
      },
      {
        key: "bicep",
        label: "Bicep / Upper Arm",
        helper: "Measure around the fullest part of your upper arm.",
      },
    ],
  },
  {
    id: "core",
    title: "Core",
    icon: Ruler,
    fields: [
      {
        key: "waist",
        label: "Natural Waist",
        helper: "The narrowest part of your torso, above the navel.",
      },
      {
        key: "hips",
        label: "Fullest Hip",
        helper: "Measure around the widest part of your hips/seat.",
      },
    ],
  },
  {
    id: "lower",
    title: "Lower Body",
    icon: Landmark,
    fields: [
      {
        key: "trouser",
        label: "Trouser Length / Outseam",
        helper: "From waist to desired hem length along the outside of your leg.",
      },
      {
        key: "inseam",
        label: "Inseam",
        helper: "From crotch to ankle along the inside of your leg.",
      },
      {
        key: "thigh",
        label: "Thigh",
        helper: "Measure around the fullest part of your upper thigh.",
      },
      {
        key: "knee",
        label: "Knee",
        helper: "Measure around the knee at its widest point.",
      },
      {
        key: "ankle",
        label: "Ankle Opening",
        helper: "Measure around the ankle where the hem would sit.",
      },
    ],
  },
];

export const MEASUREMENT_GUIDE_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDz6N6Jwtg3kSf-4UpRkX7ArnrhNC113n8Iv7uKbuD1g3LLfInmx8otc6tjTR2lNGdBKIq7Wz5dy8Phz4OdR1RHUiIzOBp2osXp6agQV-2PQw9fxvsCmMHhl1a3ERVeM5AFm5kFp3bcEIomTrwtZYPod4kxJeJ9iXakpe8CUDWctPE1GVlL_RVJia4BhnO2BsEQFEEI0AvLn-g8YD_gqw5zGyxGVWQCVSKI9wgjr68x1d4hSm-bcqZHKtzWrBaiKU9ZK-xCVwop_g";

/** Mood Fabrics — bust, waist, hip, and inseam basics */
export const MEASUREMENT_TUTORIAL_YOUTUBE_ID = "kKJyYZgicaM";

export type PreferredFit = "slim" | "regular" | "loose";

export const PREFERRED_FIT_OPTIONS: { value: PreferredFit; label: string }[] = [
  { value: "slim", label: "Slim" },
  { value: "regular", label: "Regular" },
  { value: "loose", label: "Loose" },
];
