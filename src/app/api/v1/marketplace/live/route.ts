import { listLiveMarketplaceDesignerIds } from "@/server/services/designers";
import { handleApiError, jsonData } from "@/server/http";

export async function GET() {
  try {
    return jsonData(await listLiveMarketplaceDesignerIds());
  } catch (error) {
    return handleApiError(error);
  }
}
