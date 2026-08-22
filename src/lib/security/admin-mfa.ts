export type AdminMfaDecision = "allow" | "setup" | "challenge" | "deny";

export type AuthenticatorAssurance = {
  currentLevel: string | null;
  nextLevel: string | null;
};

/**
 * Administrator MFA must fail closed. Public marketplace is not gated here.
 */
export function decideAdminMfaAccess(input: {
  isAdmin: boolean;
  aal: AuthenticatorAssurance | null;
  checkFailed: boolean;
}): AdminMfaDecision {
  if (!input.isAdmin) return "allow";
  if (input.checkFailed || !input.aal) return "deny";
  if (input.aal.nextLevel === "aal1") return "setup";
  if (input.aal.currentLevel !== "aal2") return "challenge";
  return "allow";
}
