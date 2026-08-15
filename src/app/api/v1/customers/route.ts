import { listCustomers } from "@/server/services/customers";
import { handleApiError, jsonData } from "@/server/http";
import { isAuthError, requireApiAdminAal2 } from "@/server/api-auth";

export async function GET() {
  try {
    const session = await requireApiAdminAal2();
    if (isAuthError(session)) return session;
    return jsonData(await listCustomers());
  } catch (error) {
    return handleApiError(error);
  }
}
