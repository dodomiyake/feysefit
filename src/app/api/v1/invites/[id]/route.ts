import { cancelInvite, listInvites } from "@/server/services/invites";
import { handleApiError, jsonData, jsonError } from "@/server/http";
import { isAuthError, requireApiSession } from "@/server/api-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;
    if (session.role !== "designer" && session.role !== "admin") {
      return jsonError("Forbidden", 403);
    }

    const { id } = await params;
    if (session.role === "designer" && session.designerId) {
      const owned = (await listInvites(session.designerId)).some((invite) => invite.id === id);
      if (!owned) return jsonError("Forbidden", 403);
    }

    await cancelInvite(id);
    return jsonData({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
