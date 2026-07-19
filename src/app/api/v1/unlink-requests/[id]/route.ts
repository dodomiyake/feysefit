import type { UnlinkRequest } from "@/lib/customer-access";
import { updateUnlinkRequest } from "@/server/services/unlink-requests";
import { patchCustomerLink, getCustomerLinkState } from "@/server/services/customers";
import { syncCustomerLinkFromRequest } from "@/lib/customer-access";
import { handleApiError, jsonData } from "@/server/http";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<UnlinkRequest>;
    const updated = await updateUnlinkRequest(id, body);

    const customerId = updated.customerId;
    if (customerId && customerId !== "current") {
      const current = await getCustomerLinkState(customerId);
      if (current) {
        const next = syncCustomerLinkFromRequest(current, updated);
        await patchCustomerLink(customerId, next);
      }
    }

    return jsonData(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
