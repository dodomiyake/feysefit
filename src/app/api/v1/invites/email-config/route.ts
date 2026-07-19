import { isResendSandboxFrom } from "@/lib/email/resend-config";
import { jsonData } from "@/server/http";

export async function GET() {
  return jsonData({
    sandbox: isResendSandboxFrom(),
    resendDomainsUrl: "https://resend.com/domains",
  });
}
