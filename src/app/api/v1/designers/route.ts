import { listDesigners } from "@/server/services/designers";
import { handleApiError, jsonData } from "@/server/http";

export async function GET() {
  try {
    return jsonData(await listDesigners());
  } catch (error) {
    return handleApiError(error);
  }
}
