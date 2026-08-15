import { createClient } from "@/lib/supabase/server";
import { isResendSandboxFrom } from "@/lib/email/resend-config";
import { jsonData, jsonError } from "@/server/http";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  return jsonData({
    sandbox: isResendSandboxFrom(),
    resendDomainsUrl: "https://resend.com/domains",
  });
}
