export const ACCOUNT_ACTIVITY_TYPES = [
  "login_succeeded",
  "login_failed",
  "password_changed",
  "email_changed",
  "mfa_enabled",
  "mfa_disabled",
  "sign_out_all_devices",
  "payment_details_changed",
  "payout_details_changed",
] as const;

export type AccountActivityType = (typeof ACCOUNT_ACTIVITY_TYPES)[number];

const LABELS: Record<AccountActivityType, string> = {
  login_succeeded: "Successful login",
  login_failed: "Failed login",
  password_changed: "Password changed",
  email_changed: "Email changed",
  mfa_enabled: "Two-step verification enabled",
  mfa_disabled: "Two-step verification disabled",
  sign_out_all_devices: "Sign out all devices requested",
  payment_details_changed: "Payment details changed",
  payout_details_changed: "Payout details changed",
};

export function accountActivityLabel(eventType: string): string {
  if (eventType in LABELS) return LABELS[eventType as AccountActivityType];
  return "Security event";
}

/**
 * Fire-and-forget account activity logger (client → server).
 * Never include passwords, full secrets, or raw payment numbers in meta.
 */
export function logAccountActivity(input: {
  eventType: AccountActivityType;
  email?: string;
  meta?: Record<string, unknown>;
}) {
  if (typeof window === "undefined") return;
  void fetch("/auth/account-activity", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType: input.eventType,
      email: input.email,
      meta: input.meta ?? {},
    }),
  }).catch(() => {
    // Non-blocking
  });
}

/**
 * Call when payment or payout profile fields change (future billing features).
 * Never pass full account numbers — last-4 or a boolean flag in meta only.
 */
export function logPaymentOrPayoutDetailsChanged(
  kind: "payment" | "payout",
  email?: string
) {
  logAccountActivity({
    eventType: kind === "payment" ? "payment_details_changed" : "payout_details_changed",
    email,
  });
}
