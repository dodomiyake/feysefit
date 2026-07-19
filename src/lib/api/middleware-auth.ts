import { NextResponse, type NextRequest } from "next/server";
import { isApiEnabled } from "@/lib/config/backend";
import { SESSION_COOKIE, verifySessionToken } from "@/server/auth";

const PUBLIC_API_PREFIXES = ["/api/health", "/api/v1/auth/login"];

function isPublicApiRoute(pathname: string, method: string) {
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  if (pathname === "/api/v1/auth/session" && method === "GET") {
    return true;
  }
  return false;
}

function adminApiRoute(pathname: string) {
  return (
    pathname.startsWith("/api/v1/marketplace/approvals") || pathname === "/api/v1/customers"
  );
}

async function getApiSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function enforceApiAuth(request: NextRequest): Promise<NextResponse | null> {
  if (!isApiEnabled()) {
    return null;
  }

  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/v1/")) {
    return null;
  }

  if (isPublicApiRoute(pathname, request.method)) {
    return null;
  }

  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (adminApiRoute(pathname) && session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
