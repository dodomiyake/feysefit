import type { UnlinkRequest } from "@/lib/customer-access";
import { updateUnlinkRequest, listUnlinkRequests } from "@/server/services/unlink-requests";
import { patchCustomerLink, getCustomerLinkState } from "@/server/services/customers";
import { syncCustomerLinkFromRequest } from "@/lib/customer-access";
import { handleApiError, jsonData, jsonError } from "@/server/http";
import { isAuthError, requireApiSession } from "@/server/api-auth";
import { runSensitiveHttpAction } from "@/lib/security/rate-limit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;

    const { id } = await params;
    const body = (await request.json()) as Partial<UnlinkRequest>;
    const existing = (await listUnlinkRequests()).find((row) => row.id === id);
    if (!existing) return jsonError("Not found", 404);

    const isDesignerOwner =
      session.role === "designer" && session.designerId === existing.designerId;
    const isAdmin = session.role === "admin";
    if (!isDesignerOwner && !isAdmin) return jsonError("Forbidden", 403);

    if (body.status === "approved" && !isAdmin) {
      return jsonError("Forbidden", 403);
    }

    const gated = await runSensitiveHttpAction(
      isAdmin ? "adminMutation" : "designRequest",
      session.sub,
      async () => {
        const updated = await updateUnlinkRequest(id, isAdmin ? body : {
          designerConfirmation: body.designerConfirmation,
          designerResponse: body.designerResponse,
          designerRespondedAt: body.designerRespondedAt,
        });

        const customerId = updated.customerId;
        if (customerId && customerId !== "current") {
          const current = await getCustomerLinkState(customerId);
          if (current) {
            const next = syncCustomerLinkFromRequest(current, updated);
            await patchCustomerLink(customerId, next);
          }
        }
        return updated;
      }
    );
    if (!gated.ok) return gated.response;

    return jsonData(gated.value);
  } catch (error) {
    return handleApiError(error);
  }
}
