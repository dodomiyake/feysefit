import { setDesignerMarketplaceLive } from "@/server/services/designers";
import { handleApiError, jsonData, jsonError } from "@/server/http";
import { isAuthError, requireApiRole, requireApiSession } from "@/server/api-auth";
import { runSensitiveHttpAction } from "@/lib/security/rate-limit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;

    const { id } = await params;
    const isOwner = session.role === "designer" && session.designerId === id;
    if (!isOwner) {
      const admin = await requireApiRole(["admin"]);
      if (isAuthError(admin)) return jsonError("Forbidden", 403);
    }

    const body = (await request.json()) as { live: boolean };
    if (session.role !== "admin" && body.live === true) {
      return jsonError("Forbidden", 403);
    }
    const ids = await runSensitiveHttpAction("adminMutation", session.sub, () =>
      setDesignerMarketplaceLive(id, body.live)
    );
    if (!ids.ok) return ids.response;
    return jsonData(ids.value);
  } catch (error) {
    return handleApiError(error);
  }
}
