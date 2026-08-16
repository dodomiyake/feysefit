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
  // Relationships are per designer and projects are isolated per pair. Existing
  // work with one atelier must never prevent a client from browsing another.
  void state;
  return true;
}

export function getCustomerAccountLabel(state: CustomerLinkState): string {
  if (state.linkedDesignerId) return "Linked Account";
  if (isLinkedCustomer(state) && state.unlinkStatus !== "approved") {
    return "Linked Account";
  }
  return "Marketplace Member";
}

/** True when the client still has a designer link and can start (or restart) an unlink. */
export function canCustomerRequestUnlink(state: CustomerLinkState): boolean {
  if (!state.linkedDesignerId) return false;
  return (
    state.unlinkStatus === "none" ||
    state.unlinkStatus === "declined" ||
    // Stale approve left the relationship active — allow a fresh unlink request.
    state.unlinkStatus === "approved"
  );
}

export function getMarketplaceBlockReason(state: CustomerLinkState): string {
  if (state.linkedDesignerId && state.unlinkStatus === "approved") {
    return "Your unlink was approved, but your designer link is still active. Request to unlink again so admin can finish clearing it.";
  }
  if (state.unlinkStatus === "pending") {
    return "Your unlink request is with our admin team. Marketplace access will be available if approved.";
  }
  if (state.unlinkStatus === "designer_review") {
    return "Admin is confirming your unlink request with your designer. You'll be notified once a decision is made.";
  }
  if (state.unlinkStatus === "declined") {
    return "Your unlink request was declined. You remain linked to your designer and cannot browse the marketplace.";
  }
  return "You can continue browsing designers while your existing projects remain private.";
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

/** Prefer a single open request per client↔designer pair (pending / designer_review). */
export function dedupeOpenUnlinkRequests(requests: UnlinkRequest[]): UnlinkRequest[] {
  const openStatuses = new Set(["pending", "designer_review"]);
  const closed: UnlinkRequest[] = [];
  const openByPair = new Map<string, UnlinkRequest>();

  for (const request of normalizeUnlinkRequests(requests)) {
    if (!openStatuses.has(request.status)) {
      closed.push(request);
      continue;
    }
    const key = `${request.customerId}:${request.designerId}`;
    const current = openByPair.get(key);
    if (!current) {
      openByPair.set(key, request);
      continue;
    }
    const rank = (item: UnlinkRequest) => {
      let score = 0;
      if (item.status === "designer_review") score += 4;
      if (item.adminNotes) score += 2;
      if (item.adminContactedAt) score += 1;
      return score;
    };
    if (rank(request) > rank(current)) {
      openByPair.set(key, request);
    }
  }

  return [...Array.from(openByPair.values()), ...closed];
}

export function isAwaitingDesignerConfirmation(request: UnlinkRequest): boolean {
  const normalized = normalizeUnlinkRequest(request);
  return (
    normalized.status === "designer_review" &&
    normalized.designerConfirmation === "awaiting"
  );
}

/** True when this unlink request belongs to the signed-in designer (uuid or legacy id). */
export function unlinkRequestBelongsToDesigner(
  request: UnlinkRequest,
  designerKey: string | null | undefined
): boolean {
  if (!designerKey) return false;
  return request.designerId === designerKey;
}

export function getDesignerUnlinkQueue(
  requests: UnlinkRequest[],
  designerKey?: string | null
): UnlinkRequest[] {
  const awaiting = normalizeUnlinkRequests(requests).filter((request) => {
    if (!isAwaitingDesignerConfirmation(request)) return false;
    if (!designerKey) return true;
    return unlinkRequestBelongsToDesigner(request, designerKey);
  });

  // One card per client — prefer the row with admin notes / latest contact.
  const byCustomer = new Map<string, UnlinkRequest>();
  for (const request of awaiting) {
    const key = `${request.customerId}:${request.designerId}`;
    const current = byCustomer.get(key);
    if (!current) {
      byCustomer.set(key, request);
      continue;
    }
    const preferIncoming =
      (Boolean(request.adminNotes) && !current.adminNotes) ||
      (Boolean(request.adminContactedAt) &&
        Boolean(current.adminContactedAt) &&
        request.adminContactedAt! > current.adminContactedAt!) ||
      (Boolean(request.adminContactedAt) && !current.adminContactedAt);
    if (preferIncoming) byCustomer.set(key, request);
  }

  return Array.from(byCustomer.values());
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
