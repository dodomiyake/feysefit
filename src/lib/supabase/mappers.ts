import type { CustomerReference } from "@/lib/customer-references";
import type { CustomerLinkState, UnlinkRequest } from "@/lib/customer-access";
import type { CustomerMeasurementProfile } from "@/lib/customer-measurements";
import type { Conversation, MessageAttachment, ThreadMessage } from "@/lib/conversations";
import type { ProjectStatus, UserRole } from "@/lib/design-tokens";
import { normalizeProjectStatus } from "@/lib/project-delivery";
import type { MarketplaceApproval } from "@/lib/marketplace-approvals";
import type { Customer, Designer, Message, PendingInvite, Project } from "@/lib/mock-data";
import type { ProjectItem } from "@/lib/project-items";
import type {
  DbCustomerProfile,
  DbCustomerReference,
  DbDesignerProfile,
  DbInviteCode,
  DbMarketplaceListing,
  DbMeasurement,
  DbMessage,
  DbProject,
  DbProjectItem,
  DbUnlinkRequest,
} from "@/lib/types/database";

export function profileId(row: { legacy_id: string | null; id: string }) {
  return row.legacy_id ?? row.id;
}

function resolveAvatarUrl(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function mapDesigner(row: DbDesignerProfile, portfolio: string[] = []): Designer {
  return {
    id: profileId(row),
    businessName: row.business_name,
    designerName: row.designer_name,
    location: row.location,
    specialty: row.specialty,
    bio: row.bio,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    portfolioImages: portfolio.length ? portfolio : [row.cover_image].filter(Boolean),
    coverImage: row.cover_image,
    profileImage: row.profile_image,
    createdAt: row.created_at,
    city: row.city?.trim() || row.location.split(",")[0]?.trim() || undefined,
    country: row.country?.trim() || row.location.split(",").slice(-1)[0]?.trim() || undefined,
    offersInPersonAppointments: Boolean(row.offers_in_person),
    offeredMeetingModes: (row.offered_meeting_modes as import("@/lib/local-customer").MeetingMode[] | null) ?? [
      "in_person",
      "video",
      "phone",
    ],
    appointmentSlotMinutes: row.appointment_slot_minutes ?? 30,
    priceRangeMin: row.price_range_min ?? undefined,
    priceRangeMax: row.price_range_max ?? undefined,
    yearsExperience: row.years_experience ?? undefined,
  };
}

export function mapCustomer(row: DbCustomerProfile, projectCount?: number): Customer {
  return {
    id: profileId(row),
    name: row.name,
    location: row.location,
    phone: row.phone ?? "",
    email: row.email,
    projectCount: projectCount ?? row.project_count,
    profileImage: row.profile_image || undefined,
    createdAt: row.created_at,
  };
}

export function mapCustomerReference(row: DbCustomerReference): CustomerReference {
  return {
    id: row.legacy_id ?? row.id,
    url: row.url,
    category: row.category as CustomerReference["category"],
    caption: row.caption ?? undefined,
    uploadedAt: row.uploaded_at,
  };
}

export function mapProject(
  row: DbProject,
  references: DbCustomerReference[] = [],
  designer?: Pick<DbDesignerProfile, "id" | "legacy_id" | "business_name" | "designer_name"> | null,
  customer?: Pick<DbCustomerProfile, "id" | "legacy_id"> | null,
  items: ProjectItem[] = []
): Project {
  return {
    id: profileId(row),
    projectCode: row.project_code,
    paletteId: row.palette_id,
    title: row.title,
    customerName: row.customer_name,
    customerId: customer ? profileId(customer) : row.customer_id ?? undefined,
    designerId: designer ? profileId(designer) : undefined,
    designerName: designer?.business_name ?? undefined,
    outfitType: row.outfit_type,
    deadline: row.deadline,
    budget: row.budget,
    status: normalizeProjectStatus(row.status),
    referenceImages: Array.isArray(row.reference_images)
      ? (row.reference_images as string[])
      : [],
    customerReferences: references.map(mapCustomerReference),
    customerUpdate: row.customer_update,
    designerUpdate: row.designer_update || undefined,
    internalNotes: row.internal_notes,
    description: row.description?.trim() || undefined,
    measurements: (row.measurements as Record<string, string> | null) ?? undefined,
    galleryImages: Array.isArray(row.gallery_images)
      ? (row.gallery_images as string[])
      : undefined,
    primaryFabric: row.primary_fabric ?? undefined,
    secondaryMaterial: row.secondary_material ?? undefined,
    lining: row.lining ?? undefined,
    designerFabricAdvice: row.designer_fabric_advice?.trim() || undefined,
    startedDate: row.started_date ?? undefined,
    estimatedDelivery: row.estimated_delivery ?? undefined,
    measurementFitNote: row.measurement_fit_note ?? undefined,
    teamMembers: Array.isArray(row.team_members)
      ? (row.team_members as unknown as Project["teamMembers"])
      : undefined,
    lastUpdated: row.last_updated ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? row.created_at,
    studioClientId: row.studio_client_id ?? undefined,
    groupProjectId: row.group_project_id ?? undefined,
    deliveryMethod: row.delivery_method as Project["deliveryMethod"],
    localDeliveryStatus: row.local_delivery_status as Project["localDeliveryStatus"],
    firstFittingAt: row.first_fitting_at ?? undefined,
    secondFittingAt: row.second_fitting_at ?? undefined,
    finalFittingAt: row.final_fitting_at ?? undefined,
    fittingNotes: row.fitting_notes?.trim() || undefined,
    adjustmentNotes: row.adjustment_notes?.trim() || undefined,
    totalPrice: row.total_price != null ? Number(row.total_price) : undefined,
    depositPaid: row.deposit_paid != null ? Number(row.deposit_paid) : undefined,
    paymentMethod: row.payment_method?.trim() || undefined,
    paymentNotes: row.payment_notes?.trim() || undefined,
    measurementRecordedBy: row.measurement_recorded_by as Project["measurementRecordedBy"],
    items: items.length ? items : undefined,
  };
}

export function mapProjectItem(row: DbProjectItem, projectKey: string): ProjectItem {
  return {
    id: row.legacy_id ?? row.id,
    projectId: projectKey,
    sortOrder: row.sort_order,
    title: row.title,
    outfitType: row.outfit_type,
    description: row.description?.trim() || undefined,
    status: normalizeProjectStatus(row.status),
    deadline: row.deadline,
    price: row.price,
    primaryFabric: row.primary_fabric?.trim() || undefined,
    secondaryMaterial: row.secondary_material?.trim() || undefined,
    lining: row.lining?.trim() || undefined,
    referenceImages: Array.isArray(row.reference_images)
      ? (row.reference_images as string[])
      : [],
    internalNotes: row.internal_notes?.trim() || undefined,
    measurements: (row.measurements as Record<string, string> | null) ?? undefined,
    measurementsRequired: row.measurements_required,
    measurementNotes: row.measurement_notes?.trim() || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPendingInvite(row: DbInviteCode): PendingInvite {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    email: row.email,
    projectType: row.project_type,
    sentAt: row.sent_at,
    sentAgo: row.sent_ago,
    status: row.status === "accepted" ? "accepted" : "pending",
  };
}

export function mapMeasurementProfile(
  row: DbMeasurement,
  customerLegacyId?: string
): CustomerMeasurementProfile {
  return {
    customerId: customerLegacyId ?? row.customer_id,
    unit: row.unit as CustomerMeasurementProfile["unit"],
    preferredFit: row.preferred_fit as CustomerMeasurementProfile["preferredFit"],
    status: row.status,
    values: (row.values as Record<string, string>) ?? {},
    recordedBy: (row.recorded_by as CustomerMeasurementProfile["recordedBy"]) ?? "customer",
    updatedAt: row.updated_at ?? undefined,
  };
}

export function mapThreadMessage(row: DbMessage): ThreadMessage {
  return {
    id: row.legacy_id ?? row.id,
    sender: row.sender_role as Message["sender"],
    senderName: row.sender_name,
    text: row.text,
    timestamp: row.timestamp_label,
    attachments: row.attachments
      ? (row.attachments as unknown as MessageAttachment[])
      : undefined,
  };
}

export function mapMarketplaceListing(row: DbMarketplaceListing): MarketplaceApproval {
  return {
    id: row.legacy_id ?? row.id,
    designerId: row.designer_id,
    designerName: row.designer_name,
    businessName: row.business_name,
    specialty: row.specialty,
    submittedAt: row.submitted_at,
    status: row.status,
    adminNotes: row.admin_notes ?? undefined,
    declineReason: row.decline_reason ?? undefined,
  };
}

export function mapUnlinkRequest(row: DbUnlinkRequest): UnlinkRequest {
  return {
    id: row.legacy_id ?? row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    designerId: row.designer_id,
    designerName: row.designer_name,
    reason: row.reason,
    submittedAt: row.submitted_at,
    status: row.status as UnlinkRequest["status"],
    adminNotes: row.admin_notes ?? undefined,
    adminContactedAt: row.admin_contacted_at ?? undefined,
    designerConfirmation: (row.designer_confirmation as UnlinkRequest["designerConfirmation"]) ?? null,
    designerResponse: row.designer_response ?? undefined,
    designerRespondedAt: row.designer_responded_at ?? undefined,
  };
}

export function mapCustomerLink(
  customer: DbCustomerProfile,
  designer?: DbDesignerProfile | null
): CustomerLinkState {
  return {
    linkedDesignerId: designer ? profileId(designer) : null,
    linkedDesignerName: designer?.designer_name ?? null,
    hasConcludedProject: customer.has_concluded_project,
    unlinkStatus: customer.unlink_status as CustomerLinkState["unlinkStatus"],
    unlinkReason: customer.unlink_reason,
    unlinkSubmittedAt: customer.unlink_submitted_at,
    activeUnlinkRequestId: customer.active_unlink_request_id,
    registrationType: customer.registration_type,
  };
}

export function buildProjectConversation(
  project: Project,
  messages: ThreadMessage[],
  designer: Designer,
  viewerRole: "designer" | "customer",
  customerAvatar?: string,
  projectUuid?: string
): Conversation {
  const last = messages[messages.length - 1];
  const isDesignerView = viewerRole === "designer";
  const contactName = isDesignerView ? project.customerName : designer.designerName;
  const contactRole = isDesignerView ? "customer" : "designer";
  const contactAvatar = isDesignerView
    ? resolveAvatarUrl(customerAvatar) ?? ""
    : resolveAvatarUrl(designer.profileImage) ?? "";

  return {
    id: `project-${project.id}`,
    title: isDesignerView ? project.customerName || project.title : project.title,
    preview: last
      ? `${last.senderName.split(" ")[0]}: ${last.text.slice(0, 48)}${last.text.length > 48 ? "..." : ""}`
      : project.customerUpdate,
    timestamp: last?.timestamp ?? project.lastUpdated ?? "Recently",
    avatar: isDesignerView ? resolveAvatarUrl(customerAvatar) : resolveAvatarUrl(designer.profileImage),
    tag: "Bespoke",
    online: true,
    contactName,
    contactRole,
    contactAvatar,
    dateLabel: project.lastUpdated,
    messages,
    projectUuid,
  };
}

export function toAuthUserRole(role: string): UserRole {
  if (role === "designer" || role === "customer" || role === "admin") return role;
  return "customer";
}
