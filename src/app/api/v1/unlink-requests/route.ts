import type { UnlinkRequest } from "@/lib/customer-access";
import { createUnlinkRequest, listUnlinkRequests } from "@/server/services/unlink-requests";
import { patchCustomerLink } from "@/server/services/customers";
import { handleApiError, jsonData, jsonError } from "@/server/http";
import { isAuthError, requireApiSession } from "@/server/api-auth";

export async function GET() {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;
    if (session.role === "admin") {
      return jsonData(await listUnlinkRequests());
    }
    const all = await listUnlinkRequests();
    const filtered = all.filter((row) => {
      if (session.role === "customer") return row.customerId === session.customerId;
      if (session.role === "designer") return row.designerId === session.designerId;
      return false;
    });
    return jsonData(filtered);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;
    if (session.role !== "customer" || !session.customerId) {
      return jsonError("Forbidden", 403);
    }

    const body = (await request.json()) as UnlinkRequest;
    const created = await createUnlinkRequest({
      ...body,
      customerId: session.customerId,
      status: "pending",
    });
    await patchCustomerLink(session.customerId, {
      unlinkStatus: "pending",
      unlinkReason: body.reason,
      unlinkSubmittedAt: body.submittedAt,
      activeUnlinkRequestId: created.id,
    });
    return jsonData(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
