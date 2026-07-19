import type { CustomerReference } from "@/lib/customer-references";
import { addCustomerReference } from "@/server/services/projects";
import { handleApiError, jsonData, jsonError } from "@/server/http";
import { isAuthError, requireApiSession } from "@/server/api-auth";
import { assertCanAccessProject } from "@/server/access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiSession();
    if (isAuthError(session)) return session;

    const { id } = await params;
    const access = await assertCanAccessProject(session, id);
    if (access !== true) return access;

    const body = (await request.json()) as CustomerReference;
    if (!body.id || !body.url || !body.category || !body.uploadedAt) {
      return jsonError("id, url, category, and uploadedAt are required");
    }
    const project = await addCustomerReference(id, body);
    return jsonData(project, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
