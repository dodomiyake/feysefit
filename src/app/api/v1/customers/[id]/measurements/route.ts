import { getMeasurementProfile, upsertMeasurementProfile } from "@/server/services/measurements";
import { handleApiError, jsonData } from "@/server/http";
import type { CustomerMeasurementProfile } from "@/lib/customer-measurements";
import { isAuthError, requireApiSession } from "@/server/api-auth";
import { assertCanAccessCustomer } from "@/server/access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;

    const { id } = await params;
    const access = await assertCanAccessCustomer(session, id);
    if (access !== true) return access;

    return jsonData(await getMeasurementProfile(id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;

    const { id } = await params;
    const access = await assertCanAccessCustomer(session, id);
    if (access !== true) return access;

    const body = (await request.json()) as Partial<CustomerMeasurementProfile>;
    const profile = await upsertMeasurementProfile(id, body);
    return jsonData(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
