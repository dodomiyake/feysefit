import { createClient } from "@/lib/supabase/server";
import { normalizeInviteCode } from "@/lib/invite-link";
import { resolveAppOrigin, isDeliverableEmail } from "@/lib/email/invite-email";
import { sendInviteEmail } from "@/lib/email/send-email";
import { handleApiError, jsonData, jsonError } from "@/server/http";

interface SendInviteEmailBody {
  inviteId?: string;
  customerEmail?: string;
  customerName?: string;
  projectType?: string;
  inviteCode?: string;
  personalMessage?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("You must be signed in to send invitations.", 401);
    }

    const body = (await request.json()) as SendInviteEmailBody;
    const inviteId = body.inviteId?.trim();
    const customerEmail = body.customerEmail?.trim().toLowerCase() ?? "";
    const customerName = body.customerName?.trim();
    const projectType = body.projectType?.trim();
    const inviteCode = body.inviteCode ? normalizeInviteCode(body.inviteCode) : "";
    const personalMessage = body.personalMessage?.trim();

    if (!inviteId || !customerName || !projectType || !inviteCode) {
      return jsonError("Invite details are incomplete.", 400);
    }

    if (!isDeliverableEmail(customerEmail)) {
      return jsonError("Enter a valid client email address to send the invitation.", 400);
    }

    const { data: invite, error: inviteError } = await supabase
      .from("invite_codes")
      .select("id, code, designer_id, email, name")
      .eq("id", inviteId)
      .maybeSingle();

    if (inviteError) throw new Error(inviteError.message);
    if (!invite || invite.code !== inviteCode) {
      return jsonError("Invitation not found.", 404);
    }

    const { data: designer, error: designerError } = await supabase
      .from("designer_profiles")
      .select("user_id, designer_name, business_name")
      .eq("id", invite.designer_id)
      .maybeSingle();

    if (designerError) throw new Error(designerError.message);
    if (!designer || designer.user_id !== user.id) {
      return jsonError("You do not have permission to send this invitation.", 403);
    }

    const origin = resolveAppOrigin(request.headers.get("origin") ?? undefined);
    const inviteUrl = `${origin}/join/${encodeURIComponent(inviteCode)}`;
    const designerName = designer.designer_name || designer.business_name || "Your designer";

    const result = await sendInviteEmail({
      to: customerEmail,
      customerName,
      designerName,
      projectType,
      inviteUrl,
      inviteCode,
      personalMessage,
    });

    return jsonData({ sent: true, emailId: result.id });
  } catch (error) {
    return handleApiError(error);
  }
}
