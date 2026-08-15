import { NextResponse, NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { enforceApiAuth } from "@/lib/api/middleware-auth";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { isPublicPath } from "@/lib/auth-routes";
import { applySecurityHeaders, generateCspNonce } from "@/lib/security/headers";

function withNonce(request: NextRequest, nonce: string): NextRequest {
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  return new NextRequest(request, { headers });
}

export async function proxy(request: NextRequest) {
  const nonce = generateCspNonce();
  const tagged = withNonce(request, nonce);

  try {
    const apiResponse = await enforceApiAuth(tagged);
    if (apiResponse) {
      return applySecurityHeaders(apiResponse, nonce);
    }

    if (isSupabaseEnabled()) {
      return applySecurityHeaders(await updateSession(tagged), nonce);
    }

    return applySecurityHeaders(NextResponse.next({ request: tagged }), nonce);
  } catch {
    if (isPublicPath(request.nextUrl.pathname)) {
      return applySecurityHeaders(NextResponse.next({ request: tagged }), nonce);
    }
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return applySecurityHeaders(NextResponse.redirect(login), nonce);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|__nextjs|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
