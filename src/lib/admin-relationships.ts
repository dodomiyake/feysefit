export interface AdminRelationship {
  id: string;
  designerId: string;
  designerName: string;
  customerId: string;
  customerName: string;
  registrationType: "invited" | "direct";
  isActive: boolean;
  awaitingDesigner: boolean;
  createdAt: string;
  projectCount: number;
}

export function resolveAdminRelationshipRegistrationType(input: {
  customerRegistrationType: "invited" | "direct" | null | undefined;
  relationshipRegistrationType?: "invited" | "direct";
  hasAcceptedInvite: boolean;
}): "invited" | "direct" {
  if (input.customerRegistrationType === "direct") return "direct";
  if (input.customerRegistrationType === "invited") return "invited";
  if (input.relationshipRegistrationType === "direct") return "direct";
  if (input.hasAcceptedInvite) return "invited";
  return "direct";
}

export function isActiveAdminRelationshipRow(row: AdminRelationship): boolean {
  return row.isActive || row.awaitingDesigner;
}
