import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { enforceApiAuth } from "@/lib/api/middleware-auth";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { isPublicPath } from "@/lib/auth-routes";

export async function proxy(request: NextRequest) {
  try {
    const apiResponse = await enforceApiAuth(request);
    if (apiResponse) {
      return apiResponse;
    }

    if (isSupabaseEnabled()) {
      return await updateSession(request);
    }

    return NextResponse.next();
  } catch {
    if (isPublicPath(request.nextUrl.pathname)) {
      return NextResponse.next();
    }
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(login);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|__nextjs|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
