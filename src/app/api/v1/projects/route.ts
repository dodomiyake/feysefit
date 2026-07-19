import { listProjects } from "@/server/services/projects";
import { requireApiSession, isAuthError } from "@/server/api-auth";
import { handleApiError, jsonData } from "@/server/http";

export async function GET() {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;

    const projects = await listProjects(session);
    return jsonData(projects);
  } catch (error) {
    return handleApiError(error);
  }
}
