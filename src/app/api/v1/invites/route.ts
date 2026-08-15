import { createInvite, listInvites } from "@/server/services/invites";
import { handleApiError, jsonData, jsonError } from "@/server/http";
import { isAuthError, requireApiSession } from "@/server/api-auth";

export async function GET() {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;
    if (session.role !== "designer" && session.role !== "admin") {
      return jsonError("Forbidden", 403);
    }
    const designerId = session.role === "admin" ? undefined : session.designerId;
    if (session.role === "designer" && !designerId) return jsonError("Forbidden", 403);
    return jsonData(await listInvites(designerId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;
    if (session.role !== "designer" || !session.designerId) {
      return jsonError("Forbidden", 403);
    }
    const body = await request.json();
    const invite = await createInvite({
      ...body,
      designerId: session.designerId,
    });
    return jsonData(invite, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
