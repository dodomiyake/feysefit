import { getSessionFromCookies } from "@/server/auth";
import type { SessionPayload } from "@/server/auth";
import type { UserRole } from "@/lib/design-tokens";
import { isApiEnabled } from "@/lib/config/backend";
import { jsonError } from "@/server/http";

export function legacyApiDisabledResponse() {
  return jsonError("Not found", 404);
}

export function assertLegacyApiEnabled(): Response | null {
  if (!isApiEnabled()) return legacyApiDisabledResponse();
  return null;
}

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

/** Sensitive admin mutations require a live Supabase AAL2 session. Prisma-only sessions cannot prove AAL2. */
export async function requireApiAdminAal2(): Promise<SessionPayload | Response> {
  const session = await requireApiRole(["admin"]);
  if (isAuthError(session)) return session;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Forbidden", 403);
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") return jsonError("Forbidden", 403);
    return session;
  } catch {
    return jsonError("Forbidden", 403);
  }
}
