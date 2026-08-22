import type { ThreadMessage } from "@/lib/conversations";
import { addMessageToConversation, getConversationById } from "@/server/services/conversations";
import { handleApiError, jsonData, jsonError } from "@/server/http";
import { isAuthError, requireApiSession } from "@/server/api-auth";
import { assertCanAccessConversation } from "@/server/access";
import { runSensitiveHttpAction } from "@/lib/security/rate-limit";

export async function POST(
  request: Request,
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

    const body = (await request.json()) as Pick<ThreadMessage, "text"> & {
      attachments?: ThreadMessage["attachments"];
    };

    if (!body.text?.trim()) return jsonError("text is required", 400);

    const sender = session.role === "designer" ? "designer" : "customer";
    const gated = await runSensitiveHttpAction("messagingWrite", session.sub, () =>
      addMessageToConversation(id, {
        sender,
        senderName: session.name,
        text: body.text.trim(),
        attachments: body.attachments,
      })
    );
    if (!gated.ok) return gated.response;

    return jsonData(gated.value, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
