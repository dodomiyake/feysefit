import { removeCustomerReference } from "@/server/services/projects";
import { handleApiError, jsonData } from "@/server/http";
import { isAuthError, requireApiSession } from "@/server/api-auth";
import { assertCanAccessProject } from "@/server/access";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; referenceId: string }> }
) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;

    const { id, referenceId } = await params;
    const access = await assertCanAccessProject(session, id);
    if (access !== true) return access;

    const project = await removeCustomerReference(id, referenceId);
    return jsonData(project);
  } catch (error) {
    return handleApiError(error);
  }
}
