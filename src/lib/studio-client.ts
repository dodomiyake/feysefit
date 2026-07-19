import type { PreferredFit } from "@/lib/measurement-sections";
import type { MeasurementRecordedBy } from "@/lib/local-customer";

export interface StudioClient {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  notes: string;
  unit: "inches" | "cm";
  preferredFit: PreferredFit;
  measurementValues: Record<string, string>;
  measurementRecordedBy: MeasurementRecordedBy;
  referenceImages?: string[];
  lastFittingAt?: string;
  measurementUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  designerLegacyId?: string;
  designerProfileId?: string;
  designerName?: string;
}

export function studioClientHasMeasurements(client: StudioClient) {
  return Object.values(client.measurementValues).some((value) => value.trim().length > 0);
}

export function countStudioClientMeasurements(client: StudioClient) {
  return Object.values(client.measurementValues).filter((value) => value.trim().length > 0).length;
}
