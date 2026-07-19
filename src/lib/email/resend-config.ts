export function isResendSandboxFrom(fromAddress?: string) {
  const from = fromAddress ?? process.env.INVITE_EMAIL_FROM ?? "";
  return from.includes("@resend.dev");
}

export function formatResendDeliveryError(message: string) {
  if (/only send testing emails to your own email address/i.test(message)) {
    return (
      "Resend test mode only delivers to your own Resend account email. " +
      "To email other clients, verify feysefit.com at https://resend.com/domains and set " +
      'INVITE_EMAIL_FROM to an address on that domain (e.g. invites@feysefit.com). ' +
      "Until then, copy the invitation link and share it manually."
    );
  }

  if (/domain is not verified/i.test(message)) {
    return (
      `${message} Use INVITE_EMAIL_FROM="FeyseFit <onboarding@resend.dev>" for sandbox testing, ` +
      "or verify feysefit.com at https://resend.com/domains for production."
    );
  }

  return message;
}
