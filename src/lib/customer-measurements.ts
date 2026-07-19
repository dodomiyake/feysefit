import type { PreferredFit } from "@/lib/measurement-sections";
import type { MeasurementRecordedBy } from "@/lib/local-customer";

export type MeasurementUnit = "inches" | "cm";
export type MeasurementProfileStatus = "draft" | "submitted";

export interface CustomerMeasurementProfile {
  customerId: string;
  unit: MeasurementUnit;
  preferredFit: PreferredFit;
  status: MeasurementProfileStatus;
  values: Record<string, string>;
  recordedBy: MeasurementRecordedBy;
  updatedAt?: string;
}

export const emptyMeasurementProfile = (customerId: string): CustomerMeasurementProfile => ({
  customerId,
  unit: "inches",
  preferredFit: "regular",
  status: "draft",
  values: {},
  recordedBy: "customer",
});
