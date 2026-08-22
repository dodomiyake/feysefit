export const colors = {
  accent: "#b38601",
  highlight: "#c8a45d",
  brandDark: "#09090b",
  primary: "#1c0900",
  background: "#faf6ef",
  card: "#efe3d0",
  surface: "#faf2ee",
  surfaceContainer: "#f5ece8",
  outline: "#82756d",
  inkMuted: "#50453e",
} as const;

export const commissionDefaults = {
  primaryAccent: "#6E44FF",
  secondaryAccent: "#FFC2E2",
} as const;

export const productionProjectStatuses = [
  "Enquiry",
  "Measurements Needed",
  "Design Confirmed",
  "In Production",
  "Ready for Delivery",
] as const;

export const LEGACY_DELIVERED_STATUS = "Delivered" as const;

export const postDeliveryProjectStatuses = [
  "Awaiting Customer Confirmation",
  "Issue Reported",
  "Adjustment Needed",
  "Re-delivered",
  "Completed",
  "Cancelled",
  "Admin Support",
] as const;

export const exceptionProjectStatuses = ["Cancelled", "Admin Support"] as const;

export const timelineProjectStatuses = [
  ...productionProjectStatuses,
  LEGACY_DELIVERED_STATUS,
  "Awaiting Customer Confirmation",
  "Issue Reported",
  "Adjustment Needed",
  "Re-delivered",
  "Completed",
] as const;

export const projectStatuses = [
  ...timelineProjectStatuses,
  ...exceptionProjectStatuses,
] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const designerPipelineStatuses = [
  ...productionProjectStatuses,
  "Awaiting Customer Confirmation",
  "Adjustment Needed",
  "Re-delivered",
] as const;

export type UserRole = "designer" | "customer" | "admin";
