import type { MarketplaceApproval } from "@/lib/marketplace-approvals";
import {
  createMarketplaceApproval,
  listMarketplaceApprovals,
  updateMarketplaceApproval,
} from "@/server/services/marketplace";
import { handleApiError, jsonData } from "@/server/http";

export async function GET() {
  try {
    return jsonData(await listMarketplaceApprovals());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MarketplaceApproval;
    const created = await createMarketplaceApproval(body);
    return jsonData(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
