import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clientIpFromHeaders, runSensitiveHttpAction } from "@/lib/security/rate-limit";
import { normalizeInviteCode } from "@/lib/invite-link";

const GENERIC = { ok: true as const, found: false as const };

/**
 * POST /auth/invite-lookup
 * Rate-limited by trusted network signal, session, and a global bucket.
 * Success returns public-safe fields only — no invite or designer ids.
 * All failure modes return the same found:false payload.
 */
export async function POST(request: NextRequest) {
  let code = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    code = typeof body.code === "string" ? normalizeInviteCode(body.code) : "";
  } catch {
    code = "";
  }

  const ip = clientIpFromHeaders(request.headers);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const actor = user?.id ?? "anon";

  const global = await runSensitiveHttpAction("inviteLookupGlobal", "global", async () => true as const);
  if (!global.ok) return global.response;
  const byIp = await runSensitiveHttpAction("inviteLookup", `ip:${ip}`, async () => true as const);
  if (!byIp.ok) return byIp.response;
  const byActor = await runSensitiveHttpAction("inviteLookup", `actor:${actor}`, async () => true as const);
  if (!byActor.ok) return byActor.response;
  if (code) {
    const byCode = await runSensitiveHttpAction("inviteLookup", `code:${code}`, async () => true as const);
    if (!byCode.ok) return byCode.response;
  }

  if (!code || !isServiceRoleConfigured()) {
    return NextResponse.json(GENERIC);
  }

  try {
    const admin = createServiceClient();
    const { data, error } = await admin.rpc("lookup_invite_code_server", { p_code: code });
    if (error || !data || typeof data !== "object") {
      return NextResponse.json(GENERIC);
    }
    const row = data as {
      name?: unknown;
      project_type?: unknown;
      designer_name?: unknown;
      business_name?: unknown;
    };
    return NextResponse.json({
      ok: true,
      found: true,
      name: typeof row.name === "string" ? row.name : "",
      projectType: typeof row.project_type === "string" ? row.project_type : "",
      designerName: typeof row.designer_name === "string" ? row.designer_name : "Your designer",
      businessName: typeof row.business_name === "string" ? row.business_name : "",
    });
  } catch {
    return NextResponse.json(GENERIC);
  }
}
