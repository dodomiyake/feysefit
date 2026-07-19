import { createInvite, listInvites } from "@/server/services/invites";
import { handleApiError, jsonData } from "@/server/http";

export async function GET(request: Request) {
  try {
    const designerId = new URL(request.url).searchParams.get("designerId") ?? "1";
    return jsonData(await listInvites(designerId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const invite = await createInvite(body);
    return jsonData(invite, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
