import { getDesignerById } from "@/server/services/designers";
import { handleApiError, jsonData, jsonError } from "@/server/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const designer = await getDesignerById(id);
    if (!designer) return jsonError("Designer not found", 404);
    return jsonData(designer);
  } catch (error) {
    return handleApiError(error);
  }
}
