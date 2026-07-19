import type { ProjectStatus } from "@/lib/design-tokens";
import { getProjectById, updateProjectStatus } from "@/server/services/projects";
import { handleApiError, jsonData, jsonError } from "@/server/http";
import { isAuthError, requireApiSession } from "@/server/api-auth";
import { assertCanAccessProject } from "@/server/access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;

    const { id } = await params;
    const access = await assertCanAccessProject(session, id);
    if (access !== true) return access;

    const project = await getProjectById(id);
    if (!project) return jsonError("Project not found", 404);
    return jsonData(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;

    const { id } = await params;
    const access = await assertCanAccessProject(session, id);
    if (access !== true) return access;

    const body = (await request.json()) as { status?: ProjectStatus };
    if (!body.status) return jsonError("status is required");
    const project = await updateProjectStatus(id, body.status);
    return jsonData(project);
  } catch (error) {
    return handleApiError(error);
  }
}
