import { cancelInvite } from "@/server/services/invites";
import { handleApiError, jsonData } from "@/server/http";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await cancelInvite(id);
    return jsonData({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
