import { listCustomers } from "@/server/services/customers";
import { handleApiError, jsonData } from "@/server/http";
import { isAuthError, requireApiRole } from "@/server/api-auth";

export async function GET() {
  try {
    const session = await requireApiRole(["admin"]);
    if (isAuthError(session)) return session;
    return jsonData(await listCustomers());
  } catch (error) {
    return handleApiError(error);
  }
}
