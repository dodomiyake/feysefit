import type { CustomerMeasurementProfile } from "@/lib/customer-measurements";
import { getMeasurementProfile, upsertMeasurementProfile } from "@/server/services/measurements";
import { handleApiError, jsonData, jsonError } from "@/server/http";
import { isAuthError, requireApiSession } from "@/server/api-auth";
import { assertCanAccessCustomer } from "@/server/access";

export async function GET(request: Request) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;

    const customerId = new URL(request.url).searchParams.get("customerId");
    if (!customerId) return jsonError("customerId is required", 400);
    const access = await assertCanAccessCustomer(session, customerId);
    if (access !== true) return access;

    return jsonData(await getMeasurementProfile(customerId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;

    const body = (await request.json()) as Partial<CustomerMeasurementProfile> & {
      customerId: string;
    };
    if (!body.customerId) return jsonError("customerId is required", 400);

    const access = await assertCanAccessCustomer(session, body.customerId);
    if (access !== true) return access;

    const { customerId, ...patch } = body;
    const profile = await upsertMeasurementProfile(customerId, patch);
    return jsonData(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
