import { listDesigners } from "@/server/services/designers";
import { handleApiError, jsonData } from "@/server/http";
import { isAuthError, requireApiSession } from "@/server/api-auth";

export async function GET() {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;
    return jsonData(await listDesigners());
  } catch (error) {
    return handleApiError(error);
  }
}
