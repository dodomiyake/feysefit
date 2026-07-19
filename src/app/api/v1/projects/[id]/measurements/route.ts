import { updateProjectMeasurements } from "@/server/services/measurements";
import { handleApiError, jsonData, jsonError } from "@/server/http";
import { isAuthError, requireApiSession } from "@/server/api-auth";
import { assertCanAccessProject } from "@/server/access";

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

    const body = (await request.json()) as { measurements?: Record<string, string> };
    if (!body.measurements) return jsonError("measurements is required", 400);
    const project = await updateProjectMeasurements(id, body.measurements);
    return jsonData(project);
  } catch (error) {
    return handleApiError(error);
  }
}
