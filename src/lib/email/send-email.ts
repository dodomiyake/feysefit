import {
  buildInviteEmailHtml,
  buildInviteEmailText,
  isDeliverableEmail,
} from "@/lib/email/invite-email";
import { formatResendDeliveryError } from "@/lib/email/resend-config";

interface SendInviteEmailInput {
  to: string;
  customerName: string;
  designerName: string;
  projectType: string;
  inviteUrl: string;
  inviteCode: string;
  personalMessage?: string;
}

export async function sendInviteEmail(input: SendInviteEmailInput) {
  if (!isDeliverableEmail(input.to)) {
    throw new Error("A valid client email address is required to send an invitation.");
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Email delivery is not configured. Add RESEND_API_KEY to your environment variables."
    );
  }

  const from =
    process.env.INVITE_EMAIL_FROM ?? "FeyseFit <onboarding@resend.dev>";

  const subject = `${input.designerName} invited you to FeyseFit`;
  const html = buildInviteEmailHtml(input);
  const text = buildInviteEmailText(input);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to.trim().toLowerCase()],
      subject,
      html,
      text,
    }),
  });

  const payload = (await response.json()) as { message?: string; id?: string };

  if (!response.ok) {
    const message = payload.message ?? `Email provider error (${response.status})`;
    throw new Error(formatResendDeliveryError(message));
  }

  return { id: payload.id };
}
