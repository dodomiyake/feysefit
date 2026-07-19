import type { AppAuthUser } from "@/lib/types/database";
import type { AuthUser } from "@/lib/api/client";
import type { CustomerLinkState } from "@/lib/customer-access";
import type { Project, Designer, Customer } from "@/lib/mock-data";
import type { MarketplaceApproval } from "@/lib/marketplace-approvals";
import type { UnlinkRequest } from "@/lib/customer-access";
import type { UserReport } from "@/lib/admin-reports";
import {
  getCurrentUser,
  signIn,
  signOut,
} from "@/lib/services/authService";
import { listProjects } from "@/lib/services/projectService";
import { listUnlinkRequests } from "@/lib/services/relationshipService";
import {
  listLiveMarketplaceDesignerIds,
  listMarketplaceApprovals,
} from "@/lib/services/marketplaceService";
import { getCustomerById, getCustomerLinkState, listCustomers, listCustomersForDesigner } from "@/lib/services/customerService";
import { listDesigners } from "@/lib/services/designerService";
import { listReports } from "@/lib/services/reportService";
import { listStudioClients, listAllStudioClientsForAdmin } from "@/lib/services/studioClientService";
import { listAppointmentsForDesigner, listAllAppointmentsForAdmin } from "@/lib/services/appointmentService";
import { listGroupProjects } from "@/lib/services/groupProjectService";
import {
  listTestimonialReports,
  listTestimonialsForScope,
} from "@/lib/services/testimonialService";
import { listDeliveryIssuesForScope } from "@/lib/services/deliveryService";
import type { Testimonial, TestimonialReport } from "@/lib/testimonials";
import type { ProjectDeliveryIssue } from "@/lib/project-delivery";
import { normalizeUnlinkRequests } from "@/lib/customer-access";
import type { StudioClient } from "@/lib/studio-client";
import type { GroupProject, StudioAppointment } from "@/lib/local-customer";

export function mapAppAuthUser(user: AppAuthUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    accountStatus: user.accountStatus,
    profileImage: user.profileImage,
    customerId: user.customerLegacyId ?? user.customerProfileId,
    designerId: user.designerLegacyId ?? user.designerProfileId,
    emailConfirmed: user.emailConfirmed,
  };
}

export interface SupabaseAppSnapshot {
  authUser: AuthUser | null;
  role: AuthUser["role"] | null;
  projects: Project[];
  designers: Designer[];
  customers: Customer[];
  unlinkRequests: UnlinkRequest[];
  marketplaceApprovals: MarketplaceApproval[];
  liveMarketplaceDesignerIds: string[];
  customerLink: CustomerLinkState;
  userReports: UserReport[];
  studioClients: StudioClient[];
  appointments: StudioAppointment[];
  groupProjects: GroupProject[];
  testimonials: Testimonial[];
  testimonialReports: TestimonialReport[];
  deliveryIssues: ProjectDeliveryIssue[];
}

export async function loadSupabaseSession(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  return user ? mapAppAuthUser(user) : null;
}

export async function supabaseLogin(
  email: string,
  password: string,
  options?: { captchaToken?: string | null }
) {
  const user = await signIn(email, password, options);
  return mapAppAuthUser(user);
}

export async function supabaseLogout() {
  await signOut();
}

export async function refreshSupabaseAppData(
  authUser: AuthUser | null
): Promise<Omit<SupabaseAppSnapshot, "authUser" | "role">> {
  const emptySnapshot = {
    projects: [] as Project[],
    designers: [] as Designer[],
    customers: [] as Customer[],
    unlinkRequests: [] as UnlinkRequest[],
    marketplaceApprovals: [] as MarketplaceApproval[],
    liveMarketplaceDesignerIds: [] as string[],
    customerLink: {
      linkedDesignerId: null,
      linkedDesignerName: null,
      hasConcludedProject: false,
      unlinkStatus: "none" as const,
      unlinkReason: null,
      unlinkSubmittedAt: null,
      activeUnlinkRequestId: null,
      registrationType: null,
    },
    userReports: [] as UserReport[],
    studioClients: [] as StudioClient[],
    appointments: [] as StudioAppointment[],
    groupProjects: [] as GroupProject[],
    testimonials: [] as Testimonial[],
    testimonialReports: [] as TestimonialReport[],
    deliveryIssues: [] as ProjectDeliveryIssue[],
  };

  try {
    const [projects, unlinkRequests, marketplaceApprovals, liveMarketplaceDesignerIds, designers] =
      await Promise.all([
        listProjects(),
        listUnlinkRequests(),
        listMarketplaceApprovals(),
        listLiveMarketplaceDesignerIds(),
        listDesigners(),
      ]);

  let customers: Customer[] = [];
  if (authUser?.role === "designer" && authUser.designerId) {
    customers = await listCustomersForDesigner(authUser.designerId);
  } else if (authUser?.role === "admin") {
    customers = await listCustomers();
  } else if (authUser?.role === "customer" && authUser.customerId) {
    const self = await getCustomerById(authUser.customerId);
    customers = self ? [self] : [];
  }

  let customerLink: CustomerLinkState = {
    linkedDesignerId: null,
    linkedDesignerName: null,
    hasConcludedProject: false,
    unlinkStatus: "none",
    unlinkReason: null,
    unlinkSubmittedAt: null,
    activeUnlinkRequestId: null,
    registrationType: null,
  };

  if (authUser?.customerId) {
    customerLink = await getCustomerLinkState(authUser.customerId);
    try {
      const { syncPendingInviteFromAuthMetadata } = await import("@/lib/services/inviteService");
      const linked = await syncPendingInviteFromAuthMetadata();
      if (linked) {
        customerLink = await getCustomerLinkState(authUser.customerId);
      }
    } catch {
      // Pending invite may already be accepted.
    }
  }

  let userReports: UserReport[] = [];
  if (authUser?.role === "admin") {
    try {
      userReports = await listReports();
    } catch {
      userReports = [];
    }
  }

  let studioClients: StudioClient[] = [];
  let appointments: StudioAppointment[] = [];
  let groupProjects: GroupProject[] = [];
  if (authUser?.role === "designer" && authUser.designerId) {
    try {
      [studioClients, appointments, groupProjects] = await Promise.all([
        listStudioClients(authUser.designerId),
        listAppointmentsForDesigner(authUser.designerId),
        listGroupProjects(authUser.designerId),
      ]);
    } catch {
      studioClients = [];
      appointments = [];
      groupProjects = [];
    }
  } else if (authUser?.role === "admin") {
    try {
      [studioClients, appointments] = await Promise.all([
        listAllStudioClientsForAdmin(),
        listAllAppointmentsForAdmin(),
      ]);
    } catch {
      studioClients = [];
      appointments = [];
    }
  }

  let testimonials: Testimonial[] = [];
  let testimonialReports: TestimonialReport[] = [];
  let deliveryIssues: ProjectDeliveryIssue[] = [];
  try {
    testimonials = await listTestimonialsForScope({
      role: authUser?.role ?? null,
      designerLegacyId: authUser?.designerId,
      customerLegacyId: authUser?.customerId,
    });
    deliveryIssues = await listDeliveryIssuesForScope({
      role: authUser?.role ?? null,
      designerLegacyId: authUser?.designerId,
      customerLegacyId: authUser?.customerId,
    });
    if (authUser?.role === "admin") {
      testimonialReports = await listTestimonialReports();
    }
  } catch {
    testimonials = [];
    testimonialReports = [];
    deliveryIssues = [];
  }

  return {
    projects,
    designers,
    customers,
    unlinkRequests: normalizeUnlinkRequests(unlinkRequests),
    marketplaceApprovals,
    liveMarketplaceDesignerIds,
    customerLink,
    userReports,
    studioClients,
    appointments,
    groupProjects,
    testimonials,
    testimonialReports,
    deliveryIssues,
  };
  } catch {
    return emptySnapshot;
  }
}
