import { prisma } from "@/server/db";
import { jsonData } from "@/server/http";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return jsonData({ status: "ok", database: "connected" });
  } catch {
    return jsonData({ status: "degraded", database: "disconnected" }, 503);
  }
}
