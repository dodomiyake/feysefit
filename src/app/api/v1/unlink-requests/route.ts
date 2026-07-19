import type { UnlinkRequest } from "@/lib/customer-access";
import { createUnlinkRequest, listUnlinkRequests } from "@/server/services/unlink-requests";
import { patchCustomerLink } from "@/server/services/customers";
import { handleApiError, jsonData } from "@/server/http";

export async function GET() {
  try {
    return jsonData(await listUnlinkRequests());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UnlinkRequest;
    const created = await createUnlinkRequest(body);
    await patchCustomerLink(body.customerId, {
      unlinkStatus: "pending",
      unlinkReason: body.reason,
      unlinkSubmittedAt: body.submittedAt,
      activeUnlinkRequestId: body.id,
    });
    return jsonData(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
