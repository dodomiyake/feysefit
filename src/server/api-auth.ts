import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookies } from "@/server/auth";
import type { SessionPayload } from "@/server/auth";
import type { UserRole } from "@/lib/design-tokens";
import { isApiEnabled } from "@/lib/config/backend";
import { jsonError } from "@/server/http";

export function isAuthError(result: SessionPayload | Response): result is Response {
  return result instanceof Response;
}

/** Defense-in-depth for Prisma API routes (middleware also enforces). */
export async function requireApiSession(): Promise<SessionPayload | Response> {
  if (!isApiEnabled()) {
    return jsonError("Not found", 404);
  }

  const session = await getSessionFromCookies();
  if (!session) {
    return jsonError("Unauthorized", 401);
  }

  return session;
}

export async function requireApiRole(roles: UserRole[]): Promise<SessionPayload | Response> {
  const session = await requireApiSession();
  if (isAuthError(session)) return session;

  if (!roles.includes(session.role)) {
    return jsonError("Forbidden", 403);
  }

  return session;
}
