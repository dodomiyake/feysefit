import { createClient } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/types/database";
import {
  initialOnboardingState,
  normalizeOnboardingPath,
  normalizeOnboardingStatus,
  type DesignerSetupChecklist,
  type OnboardingPath,
  type OnboardingStatus,
  type UserOnboardingState,
} from "@/lib/onboarding";

type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

function mapChecklist(value: unknown): DesignerSetupChecklist {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  return {
    portfolioUploaded: Boolean(row.portfolioUploaded),
    servicesAdded: Boolean(row.servicesAdded),
    clientInvited: Boolean(row.clientInvited),
    projectCreated: Boolean(row.projectCreated),
    availabilitySet: Boolean(row.availabilitySet),
  };
}

export async function getUserOnboardingState(
  userId: string
): Promise<UserOnboardingState> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select(
      "onboarding_status, onboarding_step, onboarding_path, terms_accepted_at, onboarding_completed_at, setup_checklist"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // Patch not applied yet — treat as complete so existing sessions keep working.
    if (/onboarding_status|column .* does not exist/i.test(error.message)) {
      return { ...initialOnboardingState, status: "completed" };
    }
    throw new Error(error.message);
  }

  if (!data) return initialOnboardingState;

  return {
    status: normalizeOnboardingStatus(data.onboarding_status),
    step: data.onboarding_step ?? "",
    path: normalizeOnboardingPath(data.onboarding_path),
    termsAcceptedAt: data.terms_accepted_at,
    completedAt: data.onboarding_completed_at,
    setupChecklist: mapChecklist(data.setup_checklist),
  };
}

export async function updateUserOnboardingState(
  userId: string,
  patch: {
    status?: OnboardingStatus;
    step?: string;
    path?: OnboardingPath;
    acceptTerms?: boolean;
    complete?: boolean;
    setupChecklist?: Partial<DesignerSetupChecklist>;
  }
): Promise<UserOnboardingState> {
  const supabase = createClient();
  const current = await getUserOnboardingState(userId);
  const now = new Date().toISOString();

  const nextChecklist = {
    ...current.setupChecklist,
    ...(patch.setupChecklist ?? {}),
  };

  const updates: UserUpdate = {
    updated_at: now,
  };

  if (patch.status !== undefined) updates.onboarding_status = patch.status;
  if (patch.step !== undefined) updates.onboarding_step = patch.step;
  if (patch.path !== undefined) updates.onboarding_path = patch.path;
  if (patch.acceptTerms) updates.terms_accepted_at = now;
  if (patch.setupChecklist) updates.setup_checklist = nextChecklist as unknown as Json;

  if (patch.complete) {
    updates.onboarding_status = "completed";
    updates.onboarding_completed_at = now;
    updates.terms_accepted_at = current.termsAcceptedAt ?? now;
    updates.onboarding_step = "done";
  } else if (patch.status === undefined && (patch.step || patch.setupChecklist)) {
    updates.onboarding_status =
      current.status === "completed" ? "completed" : "in_progress";
  }

  const { error } = await supabase.from("users").update(updates).eq("id", userId);
  if (error) {
    if (/onboarding_status|column .* does not exist/i.test(error.message)) {
      return { ...current, status: "completed" };
    }
    throw new Error(error.message);
  }

  return getUserOnboardingState(userId);
}
