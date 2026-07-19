import type { CustomerMeasurementProfile } from "@/lib/customer-measurements";
import { getMeasurementProfile, upsertMeasurementProfile } from "@/server/services/measurements";
import { handleApiError, jsonData, jsonError } from "@/server/http";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    if (!customerId) return jsonError("customerId is required", 400);
    return jsonData(await getMeasurementProfile(customerId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Partial<CustomerMeasurementProfile> & {
      customerId: string;
    };
    if (!body.customerId) return jsonError("customerId is required", 400);

    const { customerId, ...patch } = body;
    const profile = await upsertMeasurementProfile(customerId, patch);
    return jsonData(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
