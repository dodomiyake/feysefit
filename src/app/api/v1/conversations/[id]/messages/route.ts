import type { ThreadMessage } from "@/lib/conversations";
import { addMessageToConversation, getConversationById } from "@/server/services/conversations";
import { handleApiError, jsonData, jsonError } from "@/server/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversation = await getConversationById(id);
    if (!conversation) return jsonError("Conversation not found", 404);

    const body = (await request.json()) as Pick<ThreadMessage, "text" | "sender" | "senderName"> & {
      attachments?: ThreadMessage["attachments"];
    };

    if (!body.text?.trim()) return jsonError("text is required", 400);
    if (!body.sender || !body.senderName) {
      return jsonError("sender and senderName are required", 400);
    }

    const message = await addMessageToConversation(id, {
      sender: body.sender,
      senderName: body.senderName,
      text: body.text.trim(),
      attachments: body.attachments,
    });

    return jsonData(message, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
