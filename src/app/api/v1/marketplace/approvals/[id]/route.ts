import type { MarketplaceApproval } from "@/lib/marketplace-approvals";
import { updateMarketplaceApproval } from "@/server/services/marketplace";
import { handleApiError, jsonData } from "@/server/http";
import { isAuthError, requireApiAdminAal2 } from "@/server/api-auth";
import { runSensitiveHttpAction } from "@/lib/security/rate-limit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiAdminAal2();
    if (isAuthError(session)) return session;

    const { id } = await params;
    const body = (await request.json()) as Partial<MarketplaceApproval>;
    const gated = await runSensitiveHttpAction("adminMutation", session.sub, () =>
      updateMarketplaceApproval(id, body)
    );
    if (!gated.ok) return gated.response;
    return jsonData(gated.value);
  } catch (error) {
    return handleApiError(error);
  }
}
