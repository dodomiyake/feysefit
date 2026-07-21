import type { UserRole } from "@/lib/design-tokens";
import { dashboardForRole } from "@/lib/auth-routes";

export type OnboardingStatus = "not_started" | "in_progress" | "completed";

export type OnboardingPath = "designer" | "customer_invite" | "customer_direct" | "";

export interface UserOnboardingState {
  status: OnboardingStatus;
  step: string;
  path: OnboardingPath;
  termsAcceptedAt: string | null;
  completedAt: string | null;
  setupChecklist: DesignerSetupChecklist;
}

export interface DesignerSetupChecklist {
  portfolioUploaded?: boolean;
  servicesAdded?: boolean;
  clientInvited?: boolean;
  projectCreated?: boolean;
  availabilitySet?: boolean;
}

export const initialOnboardingState: UserOnboardingState = {
  status: "not_started",
  step: "",
  path: "",
  termsAcceptedAt: null,
  completedAt: null,
  setupChecklist: {},
};

export function normalizeOnboardingStatus(value: unknown): OnboardingStatus {
  if (value === "in_progress" || value === "completed" || value === "not_started") {
    return value;
  }
  return "not_started";
}

export function normalizeOnboardingPath(value: unknown): OnboardingPath {
  if (
    value === "designer" ||
    value === "customer_invite" ||
    value === "customer_direct"
  ) {
    return value;
  }
  return "";
}

export function isOnboardingComplete(state: Pick<UserOnboardingState, "status">): boolean {
  return state.status === "completed";
}

export function onboardingHrefForUser(input: {
  role: UserRole;
  path?: OnboardingPath | null;
  step?: string | null;
}): string {
  if (input.role === "admin") return dashboardForRole("admin");
  if (input.role === "designer") {
    if (input.step === "checklist") return "/onboarding/designer/checklist";
    return "/onboarding/designer";
  }
  if (input.path === "customer_direct") return "/onboarding/customer/direct";
  return "/onboarding/customer";
}

/**
 * Where to send a verified user after login / email confirmation.
 * Incomplete users resume role-based onboarding instead of jumping to the dashboard.
 */
export function postAuthDestination(input: {
  role: UserRole;
  onboardingStatus?: OnboardingStatus | null;
  onboardingPath?: OnboardingPath | null;
  onboardingStep?: string | null;
  preferredNext?: string | null;
}): string {
  if (input.role === "admin") {
    return input.preferredNext?.startsWith("/dashboard/admin")
      ? input.preferredNext
      : dashboardForRole("admin");
  }

  const status = normalizeOnboardingStatus(input.onboardingStatus);
  if (status !== "completed") {
    return onboardingHrefForUser({
      role: input.role,
      path: normalizeOnboardingPath(input.onboardingPath),
      step: input.onboardingStep,
    });
  }

  if (input.preferredNext?.startsWith("/")) {
    return input.preferredNext;
  }

  return dashboardForRole(input.role);
}

export function isDesignerProfileMarketplaceReady(input: {
  businessName?: string | null;
  location?: string | null;
  specialty?: string | null;
  portfolioCount?: number;
}): boolean {
  return Boolean(
    input.businessName?.trim() &&
      input.location?.trim() &&
      input.specialty?.trim() &&
      (input.portfolioCount ?? 0) > 0
  );
}

export function designerChecklistProgress(checklist: DesignerSetupChecklist): {
  done: number;
  total: number;
  percent: number;
} {
  const items = [
    checklist.portfolioUploaded,
    checklist.servicesAdded,
    checklist.clientInvited,
    checklist.projectCreated,
    checklist.availabilitySet,
  ];
  const done = items.filter(Boolean).length;
  const total = items.length;
  return { done, total, percent: Math.round((done / total) * 100) };
}
