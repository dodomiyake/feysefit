import { cookies } from "next/headers";
import {
  getSessionFromCookies,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/server/auth";
import type { AuthUser } from "@/server/services/auth";
import { jsonData } from "@/server/http";
import { assertLegacyApiEnabled } from "@/server/api-auth";

function userFromSession(session: NonNullable<Awaited<ReturnType<typeof getSessionFromCookies>>>): AuthUser {
  return {
    id: session.sub,
    email: session.email,
    name: session.name,
    role: session.role,
    customerId: session.customerId,
    designerId: session.designerId,
  };
}

export async function GET() {
  const disabled = assertLegacyApiEnabled();
  if (disabled) return disabled;

  const session = await getSessionFromCookies();
  if (!session) {
    return jsonData({ user: null });
  }

  return jsonData({ user: userFromSession(session) });
}

export async function DELETE() {
  const disabled = assertLegacyApiEnabled();
  if (disabled) return disabled;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return jsonData({ ok: true });
}
