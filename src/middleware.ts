import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { enforceApiAuth } from "@/lib/api/middleware-auth";
import { isSupabaseEnabled } from "@/lib/config/backend";

export async function middleware(request: NextRequest) {
  const apiResponse = await enforceApiAuth(request);
  if (apiResponse) {
    return apiResponse;
  }

  if (isSupabaseEnabled()) {
    return updateSession(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
