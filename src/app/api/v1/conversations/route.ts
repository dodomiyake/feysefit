import {
  getConversationById,
  getOrCreateDesignerConversation,
  listConversations,
} from "@/server/services/conversations";
import { handleApiError, jsonData, jsonError } from "@/server/http";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const designerId = searchParams.get("designerId") ?? undefined;
    const customerId = searchParams.get("customerId") ?? undefined;
    const createDesignerId = searchParams.get("createDesigner");

    if (createDesignerId) {
      const conversation = await getOrCreateDesignerConversation(createDesignerId);
      return jsonData([conversation]);
    }

    return jsonData(await listConversations({ designerId, customerId }));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { designerId?: string };
    if (!body.designerId) return jsonError("designerId is required", 400);
    const conversation = await getOrCreateDesignerConversation(body.designerId);
    return jsonData(conversation, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
