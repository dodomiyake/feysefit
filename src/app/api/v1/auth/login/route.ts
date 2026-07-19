import { cookies } from "next/headers";
import { authenticateUser, createSessionForUser } from "@/server/services/auth";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/auth";
import { handleApiError, jsonData, jsonError } from "@/server/http";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return jsonError("Email and password are required", 400);
    }

    const user = await authenticateUser(body.email, body.password);
    if (!user) {
      return jsonError("Invalid email or password", 401);
    }

    const { user: sessionUser, token } = await createSessionForUser(user);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());

    return jsonData({ user: sessionUser });
  } catch (error) {
    return handleApiError(error);
  }
}
