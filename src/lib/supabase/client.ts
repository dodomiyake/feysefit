import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { getSupabaseCookieOptions, isRememberSessionEnabled } from "@/lib/auth-security";

export function createClient() {
  const remember =
    typeof document !== "undefined" ? isRememberSessionEnabled() : false;

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSupabaseCookieOptions(remember),
      isSingleton: true,
    }
  );
}
