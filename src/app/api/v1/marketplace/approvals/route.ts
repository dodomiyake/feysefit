import type { MarketplaceApproval } from "@/lib/marketplace-approvals";
import {
  createMarketplaceApproval,
  listMarketplaceApprovals,
} from "@/server/services/marketplace";
import { handleApiError, jsonData } from "@/server/http";
import { isAuthError, requireApiAdminAal2 } from "@/server/api-auth";
import { runSensitiveHttpAction } from "@/lib/security/rate-limit";

export async function GET() {
  try {
    const session = await requireApiAdminAal2();
    if (isAuthError(session)) return session;
    return jsonData(await listMarketplaceApprovals());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiAdminAal2();
    if (isAuthError(session)) return session;
    const body = (await request.json()) as MarketplaceApproval;
    const gated = await runSensitiveHttpAction("adminMutation", session.sub, () =>
      createMarketplaceApproval(body)
    );
    if (!gated.ok) return gated.response;
    return jsonData(gated.value, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
