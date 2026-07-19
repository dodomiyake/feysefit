import type { CustomerLinkState } from "@/lib/customer-access";
import { patchCustomerLink, getCustomerLinkState } from "@/server/services/customers";
import { handleApiError, jsonData, jsonError } from "@/server/http";
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

    const link = await getCustomerLinkState(id);
    if (!link) return jsonError("Customer not found", 404);
    return jsonData(link);
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

    const body = (await request.json()) as Partial<CustomerLinkState>;
    const link = await patchCustomerLink(id, body);
    return jsonData(link);
  } catch (error) {
    return handleApiError(error);
  }
}
