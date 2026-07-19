export type UnlinkRequestStatus =
  | "none"
  | "pending"
  | "designer_review"
  | "approved"
  | "declined";

export type DesignerConfirmationStatus = "awaiting" | "confirmed" | "disputed" | null;

export type CustomerRegistrationType = "invited" | "direct" | null;

export interface CustomerLinkState {
  linkedDesignerId: string | null;
  linkedDesignerName: string | null;
  hasConcludedProject: boolean;
  unlinkStatus: UnlinkRequestStatus;
  unlinkReason: string | null;
  unlinkSubmittedAt: string | null;
  activeUnlinkRequestId: string | null;
  /** How the customer joined — direct signups browse marketplace first. */
  registrationType: CustomerRegistrationType;
}

export interface UnlinkRequest {
  id: string;
  customerId: string;
  customerName: string;
  designerId: string;
  designerName: string;
  reason: string;
  submittedAt: string;
  status: UnlinkRequestStatus;
  adminNotes?: string;
  adminContactedAt?: string;
  designerConfirmation: DesignerConfirmationStatus;
  designerResponse?: string;
  designerRespondedAt?: string;
}

export const DEMO_DESIGNER_ID = "1";
export const DEMO_CUSTOMER_NAME = "Chioma Adeyemi";

export function isLinkedCustomer(state: CustomerLinkState): boolean {
  return Boolean(state.linkedDesignerId) || state.registrationType === "invited";
}

export function canCustomerAccessMarketplace(state: CustomerLinkState): boolean {
  if (!isLinkedCustomer(state)) return true;
  if (state.unlinkStatus === "approved") return true;
  if (state.hasConcludedProject) return true;
  return false;
}

export function getCustomerAccountLabel(state: CustomerLinkState): string {
  if (isLinkedCustomer(state)) {
    return "Linked Account";
  }
  return "Marketplace Member";
}

export function getMarketplaceBlockReason(state: CustomerLinkState): string {
  if (state.unlinkStatus === "pending") {
    return "Your unlink request is with our admin team. Marketplace access will be available if approved.";
  }
  if (state.unlinkStatus === "designer_review") {
    return "Admin is confirming your request with your designer. You'll be notified once a decision is made.";
  }
  if (state.unlinkStatus === "declined") {
    return "Your unlink request was declined. You can access the marketplace after concluding your current project.";
  }
  return "You're linked to your designer privately. Marketplace access opens after you conclude a project, or if admin approves an unlink request.";
}

export const initialCustomerLinkState: CustomerLinkState = {
  linkedDesignerId: null,
  linkedDesignerName: null,
  hasConcludedProject: false,
  unlinkStatus: "none",
  unlinkReason: null,
  unlinkSubmittedAt: null,
  activeUnlinkRequestId: null,
  registrationType: null,
};

export function createDirectCustomerLinkState(): CustomerLinkState {
  return {
    ...initialCustomerLinkState,
    registrationType: "direct",
  };
}

export function isDirectCustomer(state: CustomerLinkState): boolean {
  return state.registrationType === "direct";
}

export function normalizeCustomerLinkState(state: CustomerLinkState): CustomerLinkState {
  return {
    ...initialCustomerLinkState,
    ...state,
    registrationType: state.registrationType ?? null,
  };
}

/** Backfill missing fields from older sessionStorage snapshots. */
export function normalizeUnlinkRequest(request: UnlinkRequest): UnlinkRequest {
  const designerConfirmation =
    request.designerConfirmation ??
    (request.status === "designer_review" ? "awaiting" : null);

  return {
    ...request,
    designerConfirmation,
    designerId: request.designerId || DEMO_DESIGNER_ID,
  };
}

export function normalizeUnlinkRequests(requests: UnlinkRequest[]): UnlinkRequest[] {
  return requests.map(normalizeUnlinkRequest);
}

export function isAwaitingDesignerConfirmation(request: UnlinkRequest): boolean {
  const normalized = normalizeUnlinkRequest(request);
  return (
    normalized.designerId === DEMO_DESIGNER_ID &&
    normalized.status === "designer_review" &&
    normalized.designerConfirmation === "awaiting"
  );
}

export function getDesignerUnlinkQueue(requests: UnlinkRequest[]): UnlinkRequest[] {
  return normalizeUnlinkRequests(requests).filter(isAwaitingDesignerConfirmation);
}

export function syncCustomerLinkFromRequest(
  link: CustomerLinkState,
  request: UnlinkRequest | undefined
): CustomerLinkState {
  if (!request) return link;
  if (request.status === "approved") {
    return {
      linkedDesignerId: null,
      linkedDesignerName: null,
      hasConcludedProject: link.hasConcludedProject,
      unlinkStatus: "approved",
      unlinkReason: null,
      unlinkSubmittedAt: null,
      activeUnlinkRequestId: request.id,
      registrationType: link.registrationType,
    };
  }
  return {
    ...link,
    unlinkStatus: request.status,
    unlinkReason: request.reason,
    unlinkSubmittedAt: request.submittedAt,
    activeUnlinkRequestId: request.id,
  };
}
