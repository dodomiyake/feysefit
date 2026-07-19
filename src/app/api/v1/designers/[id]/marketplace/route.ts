import { setDesignerMarketplaceLive } from "@/server/services/designers";
import { handleApiError, jsonData } from "@/server/http";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { live: boolean };
    const ids = await setDesignerMarketplaceLive(id, body.live);
    return jsonData(ids);
  } catch (error) {
    return handleApiError(error);
  }
}
