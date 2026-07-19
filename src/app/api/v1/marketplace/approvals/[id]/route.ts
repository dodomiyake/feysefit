import type { MarketplaceApproval } from "@/lib/marketplace-approvals";
import { updateMarketplaceApproval } from "@/server/services/marketplace";
import { handleApiError, jsonData } from "@/server/http";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<MarketplaceApproval>;
    const updated = await updateMarketplaceApproval(id, body);
    return jsonData(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
