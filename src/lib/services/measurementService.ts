import { createClient } from "@/lib/supabase/client";
import { mapMeasurementProfile } from "@/lib/supabase/mappers";
import { emptyMeasurementProfile } from "@/lib/customer-measurements";
import type { CustomerMeasurementProfile } from "@/lib/customer-measurements";
import { resolveCustomerProfileId } from "@/lib/services/customerService";
import {
  formatLastUpdated,
} from "@/lib/project-updates";
import { applyMeasurementSubmissionToProject } from "@/lib/services/projectService";

export async function getMeasurementProfile(
  customerId: string
): Promise<CustomerMeasurementProfile> {
  const supabase = createClient();
  const profileId = await resolveCustomerProfileId(customerId);
  if (!profileId) return emptyMeasurementProfile(customerId);

  const { data, error } = await supabase
    .from("measurements")
    .select("*")
    .eq("customer_id", profileId)
    .is("project_id", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return emptyMeasurementProfile(customerId);
  return mapMeasurementProfile(data, customerId);
}

export async function saveMeasurementProfile(
  customerId: string,
  patch: Partial<Omit<CustomerMeasurementProfile, "customerId">>,
  customerName?: string
) {
  const supabase = createClient();
  const profileId = await resolveCustomerProfileId(customerId);
  if (!profileId) throw new Error("Customer not found");

  const updatedAt = formatLastUpdated();

  const { data: existing } = await supabase
    .from("measurements")
    .select("id")
    .eq("customer_id", profileId)
    .is("project_id", null)
    .maybeSingle();

  const payload = {
    customer_id: profileId,
    project_id: null,
    unit: patch.unit ?? "inches",
    preferred_fit: patch.preferredFit ?? "regular",
    status: patch.status ?? "draft",
    values: patch.values ?? {},
    recorded_by: patch.recordedBy ?? "customer",
    updated_at: updatedAt,
  };

  const { data, error } = existing
    ? await supabase.from("measurements").update(payload).eq("id", existing.id).select("*").single()
    : await supabase.from("measurements").insert(payload).select("*").single();
  if (error) throw new Error(error.message);

  if (patch.status === "submitted") {
    const name =
      customerName ??
      (
        await supabase
          .from("customer_profiles")
          .select("name")
          .eq("id", profileId)
          .maybeSingle()
      ).data?.name ??
      "Your client";
    await applyMeasurementSubmissionToProject(customerId, name, patch.values ?? {});
  }

  return mapMeasurementProfile(data, customerId);
}
