import { getConversationById } from "@/server/services/conversations";
import { handleApiError, jsonData, jsonError } from "@/server/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversation = await getConversationById(id);
    if (!conversation) return jsonError("Conversation not found", 404);
    return jsonData(conversation);
  } catch (error) {
    return handleApiError(error);
  }
}
