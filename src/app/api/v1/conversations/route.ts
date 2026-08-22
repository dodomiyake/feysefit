import {
  getOrCreateDesignerConversation,
  listConversations,
} from "@/server/services/conversations";
import { handleApiError, jsonData, jsonError } from "@/server/http";
import { isAuthError, requireApiSession } from "@/server/api-auth";
import { runSensitiveHttpAction } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;

    if (session.role === "admin") {
      const { searchParams } = new URL(request.url);
      return jsonData(
        await listConversations({
          designerId: searchParams.get("designerId") ?? undefined,
          customerId: searchParams.get("customerId") ?? undefined,
        })
      );
    }

    if (session.role === "designer") {
      if (!session.designerId) return jsonError("Forbidden", 403);
      const createDesignerId = new URL(request.url).searchParams.get("createDesigner");
      if (createDesignerId && createDesignerId !== session.designerId) {
        return jsonError("Forbidden", 403);
      }
      return jsonData(await listConversations({ designerId: session.designerId }));
    }

    if (session.role === "customer") {
      if (!session.customerId) return jsonError("Forbidden", 403);
      const createDesignerId = new URL(request.url).searchParams.get("createDesigner");
      if (createDesignerId) {
        const conversation = await getOrCreateDesignerConversation(createDesignerId);
        return jsonData([conversation]);
      }
      return jsonData(await listConversations({ customerId: session.customerId }));
    }

    return jsonError("Forbidden", 403);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;
    if (session.role !== "customer") return jsonError("Forbidden", 403);

    const body = (await request.json()) as { designerId?: string };
    if (!body.designerId) return jsonError("designerId is required", 400);
    const designerId = body.designerId;
    const conversation = await runSensitiveHttpAction("messagingWrite", session.sub, () =>
      getOrCreateDesignerConversation(designerId)
    );
    if (!conversation.ok) return conversation.response;
    return jsonData(conversation.value, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
