const INVITE_LOCAL_SUFFIX = "@invite.local";

export function isDeliverableEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.endsWith(INVITE_LOCAL_SUFFIX)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function resolveAppOrigin(requestOrigin?: string) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (requestOrigin) {
    return requestOrigin.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export function buildInviteEmailHtml(input: {
  customerName: string;
  designerName: string;
  projectType: string;
  inviteUrl: string;
  inviteCode: string;
  personalMessage?: string;
}) {
  const messageBlock = input.personalMessage?.trim()
    ? `<p style="margin:24px 0;padding:16px 20px;background:#faf6ef;border-left:4px solid #b38601;color:#50453e;font-size:15px;line-height:1.6;border-radius:4px;">
        ${escapeHtml(input.personalMessage.trim())}
      </p>`
    : "";

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#faf6ef;font-family:Georgia,'Times New Roman',serif;color:#1c0900;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ef;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e8dfd6;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 24px;background:#1c0900;color:#faf6ef;">
                <p style="margin:0;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#c8a45d;">FeyseFit</p>
                <h1 style="margin:12px 0 0;font-size:28px;font-weight:600;line-height:1.3;">You&apos;re invited</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1c0900;">
                  Hi ${escapeHtml(input.customerName)},
                </p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#50453e;">
                  <strong style="color:#1c0900;">${escapeHtml(input.designerName)}</strong> has invited you to join their atelier on FeyseFit for a
                  <strong style="color:#1c0900;">${escapeHtml(input.projectType)}</strong> project.
                </p>
                ${messageBlock}
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#50453e;">
                  Accept your invitation to create your account, share measurements, and collaborate on your bespoke commission.
                </p>
                <p style="margin:0 0 28px;text-align:center;">
                  <a href="${escapeHtml(input.inviteUrl)}" style="display:inline-block;padding:14px 28px;background:#1c0900;color:#faf6ef;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;">
                    Accept invitation
                  </a>
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#82756d;">
                  Or copy this link into your browser:<br />
                  <a href="${escapeHtml(input.inviteUrl)}" style="color:#b38601;word-break:break-all;">${escapeHtml(input.inviteUrl)}</a>
                </p>
                <p style="margin:24px 0 0;font-size:12px;color:#82756d;">
                  Invite code: <span style="font-family:monospace;color:#1c0900;">${escapeHtml(input.inviteCode)}</span>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildInviteEmailText(input: {
  customerName: string;
  designerName: string;
  projectType: string;
  inviteUrl: string;
  inviteCode: string;
  personalMessage?: string;
}) {
  const lines = [
    `Hi ${input.customerName},`,
    "",
    `${input.designerName} has invited you to join their atelier on FeyseFit for a ${input.projectType} project.`,
  ];

  if (input.personalMessage?.trim()) {
    lines.push("", input.personalMessage.trim());
  }

  lines.push(
    "",
    "Accept your invitation:",
    input.inviteUrl,
    "",
    `Invite code: ${input.inviteCode}`,
    "",
    "— FeyseFit"
  );

  return lines.join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
