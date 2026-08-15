import { cookies } from "next/headers";
import { authenticateUser, createSessionForUser } from "@/server/services/auth";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/auth";
import { handleApiError, jsonData, jsonError } from "@/server/http";
import { assertLegacyApiEnabled } from "@/server/api-auth";
import { clientIpFromHeaders, runSensitiveHttpAction } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const disabled = assertLegacyApiEnabled();
    if (disabled) return disabled;

    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return jsonError("Email and password are required", 400);
    }

    const gated = await runSensitiveHttpAction(
      "authAbuse",
      `${clientIpFromHeaders(request.headers)}:${body.email.trim().toLowerCase()}`,
      async () => {
        const user = await authenticateUser(body.email!, body.password!);
        if (!user) return null;
        return createSessionForUser(user);
      }
    );
    if (!gated.ok) return gated.response;
    if (!gated.value) {
      return jsonError("Invalid email or password", 401);
    }

    const { user: sessionUser, token } = gated.value;
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());

    return jsonData({ user: sessionUser });
  } catch (error) {
    return handleApiError(error);
  }
}
