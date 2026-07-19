import { createDirectCustomerLinkState } from "@/lib/customer-access";
import { isApiEnabled, isSupabaseEnabled } from "@/lib/config/backend";
import { normalizeInviteCode } from "@/lib/invite-link";
import { api } from "@/lib/api/client";
import { updateUserProfile } from "@/lib/services/authService";
import {
  getCustomerLinkState,
  patchCustomerLink,
  updateCustomerProfile,
} from "@/lib/services/customerService";
import {
  acceptInviteCode,
  getInviteByCode,
  resolveLocalInviteDesignerId,
} from "@/lib/services/inviteService";
import { saveMeasurementProfile } from "@/lib/services/measurementService";

export interface CompleteCustomerOnboardingInput {
  userId: string;
  customerId: string;
  name: string;
  location: string;
  phone?: string;
  styleNotes?: string;
  measurementUnit: "inches" | "cm";
  inviteCode?: string;
  mode: "invite" | "direct";
}

export interface CompleteCustomerOnboardingResult {
  linkedViaInvite: boolean;
  designerLegacyId: string | null;
  linkedToDesigner: boolean;
}

async function acceptInviteForOnboarding(inviteCode: string) {
  const normalized = normalizeInviteCode(inviteCode);
  if (!normalized) {
    throw new Error("Enter a valid invite code.");
  }

  if (isSupabaseEnabled()) {
    const details = await getInviteByCode(normalized);
    if (!details) {
      throw new Error("Invite code not found. Check the code from your designer.");
    }
    if (details.status === "expired") {
      throw new Error("This invite has expired. Ask your designer for a new code.");
    }
    if (details.status === "pending") {
      await acceptInviteCode(normalized);
    }
    return details.designerLegacyId || null;
  }

  const designerLegacyId = resolveLocalInviteDesignerId(normalized);
  if (!designerLegacyId) {
    throw new Error("Invite code not found. Check the code from your designer.");
  }
  return designerLegacyId;
}

export async function completeCustomerOnboarding(
  input: CompleteCustomerOnboardingInput
): Promise<CompleteCustomerOnboardingResult> {
  const trimmedName = input.name.trim();
  const trimmedLocation = input.location.trim();
  const trimmedPhone = input.phone?.trim() ?? "";
  const trimmedStyleNotes = input.styleNotes?.trim() ?? "";
  const normalizedInvite = input.inviteCode?.trim()
    ? normalizeInviteCode(input.inviteCode)
    : "";

  const useSupabase = isSupabaseEnabled();
  const useApi = isApiEnabled();

  if (useSupabase || useApi) {
    await updateUserProfile(input.userId, { name: trimmedName });
    await updateCustomerProfile(input.customerId, {
      name: trimmedName,
      location: trimmedLocation,
      phone: trimmedPhone,
      styleNotes: trimmedStyleNotes,
    });

    if (useSupabase) {
      await saveMeasurementProfile(
        input.customerId,
        { unit: input.measurementUnit, status: "draft" },
        trimmedName
      );
    } else {
      await api.measurements.save(input.customerId, {
        unit: input.measurementUnit,
        status: "draft",
      });
    }

    let designerLegacyId: string | null = null;

    if (normalizedInvite) {
      designerLegacyId = await acceptInviteForOnboarding(normalizedInvite);
    } else if (input.mode === "direct") {
      const direct = createDirectCustomerLinkState();
      if (useSupabase) {
        await patchCustomerLink(input.customerId, direct);
      } else {
        await api.customers.patchLink(input.customerId, direct);
      }
    }

    const link = await getCustomerLinkState(input.customerId);

    return {
      linkedViaInvite: Boolean(normalizedInvite),
      designerLegacyId: designerLegacyId ?? link.linkedDesignerId,
      linkedToDesigner: Boolean(link.linkedDesignerId),
    };
  }

  let designerLegacyId: string | null = null;
  if (normalizedInvite) {
    designerLegacyId = await acceptInviteForOnboarding(normalizedInvite);
  }

  return {
    linkedViaInvite: Boolean(normalizedInvite),
    designerLegacyId,
    linkedToDesigner: Boolean(designerLegacyId),
  };
}
