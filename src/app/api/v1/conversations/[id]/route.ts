import { getConversationById } from "@/server/services/conversations";
import { handleApiError, jsonData, jsonError } from "@/server/http";
import { isAuthError, requireApiSession } from "@/server/api-auth";
import { assertCanAccessConversation } from "@/server/access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;

    const { id } = await params;
    const access = await assertCanAccessConversation(session, id);
    if (access !== true) return access;

    const conversation = await getConversationById(id);
    if (!conversation) return jsonError("Conversation not found", 404);
    return jsonData(conversation);
  } catch (error) {
    return handleApiError(error);
  }
}
