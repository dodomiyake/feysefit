"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { UserRole, ProjectStatus } from "@/lib/design-tokens";
import type { Project, Designer, Customer } from "@/lib/mock-data";
import type { CustomerReference } from "@/lib/customer-references";
import {
  type CustomerLinkState,
  type UnlinkRequest,
  type UnlinkRequestStatus,
  initialCustomerLinkState,
  createDirectCustomerLinkState,
  normalizeCustomerLinkState,
  canCustomerAccessMarketplace,
  syncCustomerLinkFromRequest,
  normalizeUnlinkRequests,
  getDesignerUnlinkQueue,
  normalizeUnlinkRequest,
  DEMO_DESIGNER_ID,
  DEMO_CUSTOMER_NAME,
} from "@/lib/customer-access";
import {
  designers as seedDesigners,
  customers as seedCustomers,
  projects as seedProjects,
} from "@/lib/mock-data";
import { api, type AuthUser } from "@/lib/api/client";
import { isApiEnabled, isSupabaseEnabled } from "@/lib/config/backend";
import {
  clearAppSessionMarkers,
  startAppSession,
} from "@/lib/auth-security";
import { createClient } from "@/lib/supabase/client";
import {
  loadSupabaseSession,
  refreshSupabaseAppData,
  supabaseLogin,
  supabaseLogout,
} from "@/context/supabase-bridge";
import * as supabaseServices from "@/lib/services";
import { getUserPreferences } from "@/lib/services/preferenceService";
import {
  PROJECTS_STORAGE_KEY,
  PROJECTS_UPDATED_EVENT,
  readProjectsFromStorage,
  updateProjectStatusInStore,
  addCustomerReferenceToStore,
  removeCustomerReferenceFromStore,
} from "@/lib/project-storage";
import {
  type MarketplaceApproval,
  DEFAULT_LIVE_DESIGNER_IDS,
  seedMarketplaceApprovals,
  getPendingApprovals,
  hasPendingApprovalForDesigner,
  isDesignerLive,
  MARKETPLACE_APPROVALS_STORAGE_KEY,
  MARKETPLACE_LIVE_IDS_STORAGE_KEY,
} from "@/lib/marketplace-approvals";
import type { UserReport } from "@/lib/admin-reports";
import type { StudioClient } from "@/lib/studio-client";
import type { GroupProject, StudioAppointment } from "@/lib/local-customer";
import type { SubmitTestimonialPayload, Testimonial, TestimonialReport } from "@/lib/testimonials";
import type { DeliveryIssueType, ProjectDeliveryIssue } from "@/lib/project-delivery";
import { readTestimonialReportsFromStorage, readTestimonialsFromStorage } from "@/lib/testimonial-store";
import { readDeliveryIssuesFromStorage } from "@/lib/delivery-issue-store";

interface AppContextValue {
  role: UserRole | null;
  authUser: AuthUser | null;
  hydrated: boolean;
  setRole: (role: UserRole | null) => void;
  login: (
    email: string,
    password: string,
    options?: { rememberMe?: boolean; captchaToken?: string | null }
  ) => Promise<AuthUser>;
  logout: () => Promise<void>;
  measurementUnit: "inches" | "cm";
  setMeasurementUnit: (unit: "inches" | "cm") => void;
  toast: { message: string; type: "success" | "error" } | null;
  showToast: (message: string, type?: "success" | "error") => void;
  clearToast: () => void;
  customerLink: CustomerLinkState;
  linkCustomerToDesigner: (designerId: string, options?: { source?: "invite" | "marketplace" }) => void;
  setCustomerHasConcludedProject: (value: boolean) => void;
  submitUnlinkRequest: (reason: string) => void;
  canAccessMarketplace: boolean;
  unlinkRequests: UnlinkRequest[];
  adminSendDesignerConfirmation: (requestId: string, notes?: string) => void;
  designerRespondToUnlink: (requestId: string, confirmed: boolean, response: string) => void;
  adminApproveUnlink: (requestId: string) => void;
  adminDeclineUnlink: (requestId: string, notes?: string) => void;
  initDemoCustomer: (linked?: boolean) => void;
  initDirectCustomer: () => void;
  getDesignerPendingConfirmations: () => UnlinkRequest[];
  projects: Project[];
  projectsReady: boolean;
  designers: Designer[];
  customers: Customer[];
  getDesignerById: (id: string) => Designer | undefined;
  syncProjects: () => void;
  updateProjectStatus: (projectId: string, status: ProjectStatus) => void;
  addCustomerReference: (projectId: string, reference: CustomerReference) => void;
  removeCustomerReference: (projectId: string, referenceId: string) => void;
  addProjectGalleryImage: (projectId: string, imageUrl: string) => void;
  marketplaceApprovals: MarketplaceApproval[];
  liveMarketplaceDesignerIds: string[];
  getPendingMarketplaceApprovals: () => MarketplaceApproval[];
  getLiveMarketplaceDesigners: () => Designer[];
  isDesignerMarketplaceLive: (designerId: string) => boolean;
  submitMarketplaceApprovalRequest: (designerId: string) => void;
  setDesignerMarketplaceVisibility: (designerId: string, visible: boolean) => void;
  adminApproveMarketplace: (approvalId: string, adminNotes?: string) => void;
  adminDeclineMarketplace: (approvalId: string, reason?: string) => void;
  adminDismissReport: (reportId: string) => Promise<void>;
  adminSuspendReportedUser: (reportId: string) => Promise<void>;
  adminBanReportedUser: (reportId: string) => Promise<void>;
  adminSetDesignerMarketplaceLive: (designerId: string, live: boolean) => Promise<void>;
  refreshAppData: () => Promise<void>;
  appDataRevision: number;
  userReports: UserReport[];
  studioClients: StudioClient[];
  appointments: StudioAppointment[];
  groupProjects: GroupProject[];
  testimonials: Testimonial[];
  testimonialReports: TestimonialReport[];
  submitTestimonial: (input: SubmitTestimonialPayload) => Promise<void>;
  requestProjectTestimonial: (projectId: string) => Promise<void>;
  hideTestimonialFromProfile: (testimonialId: string, hidden: boolean) => Promise<void>;
  reportTestimonial: (testimonialId: string, reason: string, detail: string) => Promise<void>;
  adminRemoveTestimonial: (testimonialId: string) => Promise<void>;
  adminResolveTestimonialReport: (reportId: string, status: "dismissed" | "resolved") => Promise<void>;
  deliveryIssues: ProjectDeliveryIssue[];
  confirmProjectDelivery: (projectId: string) => Promise<void>;
  reportProjectDeliveryIssue: (input: {
    projectId: string;
    issueType: DeliveryIssueType;
    detail: string;
  }) => Promise<void>;
  respondToDeliveryIssue: (input: {
    issueId: string;
    response: string;
    projectStatus?: ProjectStatus;
    markResolved?: boolean;
  }) => Promise<void>;
  redeliverProject: (projectId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEY_LINK = "feysefit_customer_link";
const STORAGE_KEY_REQUESTS = "feysefit_unlink_requests";
const STORAGE_KEY_ROLE = "feysefit_role";
const demoUnlinkRequests: UnlinkRequest[] = [
  {
    id: "ur-1",
    customerId: "5",
    customerName: "Ngozi Eze",
    designerId: DEMO_DESIGNER_ID,
    designerName: "Adaeze Okonkwo",
    reason: "Relocating abroad permanently and wish to find a local designer.",
    submittedAt: "Jun 29, 2026",
    status: "pending",
    designerConfirmation: null,
  },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, JSON.stringify(value));
}

function findActiveRequestForCustomer(
  requests: UnlinkRequest[],
  customerName = DEMO_CUSTOMER_NAME
) {
  return requests.find(
    (r) =>
      (r.customerId === "current" || r.customerName === customerName) &&
      r.status !== "approved" &&
      r.status !== "declined"
  );
}

function formatRequestDate() {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function clearSessionStorage() {
  sessionStorage.removeItem(STORAGE_KEY_LINK);
  sessionStorage.removeItem(STORAGE_KEY_REQUESTS);
  sessionStorage.removeItem(STORAGE_KEY_ROLE);
  sessionStorage.removeItem(MARKETPLACE_APPROVALS_STORAGE_KEY);
  sessionStorage.removeItem(MARKETPLACE_LIVE_IDS_STORAGE_KEY);
}

async function loadDesignerLocalData(designerLegacyId: string) {
  const [clients, appts, groups] = await Promise.all([
    supabaseServices.listStudioClients(designerLegacyId),
    supabaseServices.listAppointmentsForDesigner(designerLegacyId),
    supabaseServices.listGroupProjects(designerLegacyId),
  ]);
  return { studioClients: clients, appointments: appts, groupProjects: groups };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const useSupabase = isSupabaseEnabled();
  const useApi = isApiEnabled();
  const useRemote = useSupabase || useApi;
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [measurementUnit, setMeasurementUnit] = useState<"inches" | "cm">("inches");
  const [toast, setToast] = useState<AppContextValue["toast"]>(null);
  const [customerLink, setCustomerLink] = useState<CustomerLinkState>(initialCustomerLinkState);
  const [unlinkRequests, setUnlinkRequests] = useState<UnlinkRequest[]>(() =>
    useRemote ? [] : demoUnlinkRequests
  );
  const [projects, setProjects] = useState<Project[]>(() => (useRemote ? [] : seedProjects));
  const [projectsReady, setProjectsReady] = useState(false);
  const [appDesigners, setAppDesigners] = useState<Designer[]>(() => (useRemote ? [] : seedDesigners));
  const [appCustomers, setAppCustomers] = useState<Customer[]>(() => (useRemote ? [] : seedCustomers));
  const [hydrated, setHydrated] = useState(false);
  const [marketplaceApprovals, setMarketplaceApprovals] = useState<MarketplaceApproval[]>(() =>
    useRemote ? [] : seedMarketplaceApprovals
  );
  const [liveMarketplaceDesignerIds, setLiveMarketplaceDesignerIds] = useState<string[]>(() =>
    useRemote ? [] : DEFAULT_LIVE_DESIGNER_IDS
  );
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [appDataRevision, setAppDataRevision] = useState(0);
  const [studioClients, setStudioClients] = useState<StudioClient[]>([]);
  const [appointments, setAppointments] = useState<StudioAppointment[]>([]);
  const [groupProjects, setGroupProjects] = useState<GroupProject[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(() =>
    useRemote ? [] : readTestimonialsFromStorage()
  );
  const [testimonialReports, setTestimonialReports] = useState<TestimonialReport[]>(() =>
    useRemote ? [] : readTestimonialReportsFromStorage()
  );
  const [deliveryIssues, setDeliveryIssues] = useState<ProjectDeliveryIssue[]>(() =>
    useRemote ? [] : readDeliveryIssuesFromStorage()
  );

  const syncProjects = useCallback(async () => {
    if (useSupabase) {
      try {
        const list = await supabaseServices.listProjects();
        setProjects(list);
        setProjectsReady(true);
      } catch {
        setProjectsReady(true);
      }
      return;
    }
    if (useApi) {
      try {
        const list = await api.projects.list();
        setProjects(list);
        setProjectsReady(true);
      } catch {
        setProjectsReady(true);
      }
      return;
    }
    setProjects(readProjectsFromStorage());
    setProjectsReady(true);
  }, [useApi, useSupabase]);

  const refreshAppData = useCallback(
    async (user?: AuthUser | null) => {
      if (useSupabase) {
        let sessionUser: AuthUser | null = null;
        try {
          sessionUser = await loadSupabaseSession();
          if (sessionUser) setAuthUser(sessionUser);
        } catch {
          // Auth unreachable — keep cached session if any.
        }
        const activeUser = user ?? sessionUser ?? authUser;
        try {
          const data = await refreshSupabaseAppData(activeUser);
          setProjects(data.projects);
          setProjectsReady(true);
          setAppDesigners(data.designers);
          setAppCustomers(data.customers);
          setUnlinkRequests(data.unlinkRequests);
          setMarketplaceApprovals(data.marketplaceApprovals);
          setLiveMarketplaceDesignerIds(data.liveMarketplaceDesignerIds);
          setCustomerLink(normalizeCustomerLinkState(data.customerLink));
          setUserReports(data.userReports);
          setStudioClients(data.studioClients);
          setAppointments(data.appointments);
          setGroupProjects(data.groupProjects);
          setTestimonials(data.testimonials);
          setTestimonialReports(data.testimonialReports);
          setDeliveryIssues(data.deliveryIssues);
          setAppDataRevision((revision) => revision + 1);
          if (activeUser?.id) {
            try {
              const prefs = await getUserPreferences(activeUser.id);
              setMeasurementUnit(prefs.measurementUnit);
            } catch {
              // Preferences table may not exist until patch is applied.
            }
          }
        } catch (error) {
          console.error("Failed to refresh Supabase app data", error);
        }
        return;
      }

      if (!useApi) {
        const activeUser = user ?? authUser;
        setTestimonials(readTestimonialsFromStorage());
        setTestimonialReports(readTestimonialReportsFromStorage());
        setDeliveryIssues(readDeliveryIssuesFromStorage());
        if (activeUser?.role === "designer" && activeUser.designerId) {
          try {
            const local = await loadDesignerLocalData(activeUser.designerId);
            setStudioClients(local.studioClients);
            setAppointments(local.appointments);
            setGroupProjects(local.groupProjects);
            setAppDataRevision((revision) => revision + 1);
          } catch {
            // Local studio tables may not exist until patch is applied.
          }
        }
        return;
      }

      try {
        const [projectsList, unlinkList, approvals, liveIds, designersList, customersList] =
          await Promise.all([
          api.projects.list(),
          api.unlinkRequests.list(),
          api.marketplace.approvals(),
          api.marketplace.liveDesignerIds(),
          api.designers.list(),
          api.customers.list(),
        ]);

        setProjects(projectsList);
        setProjectsReady(true);
        setAppDesigners(designersList);
        setAppCustomers(customersList);
        setUnlinkRequests(normalizeUnlinkRequests(unlinkList));
        setMarketplaceApprovals(approvals);
        setLiveMarketplaceDesignerIds(liveIds);
        setUserReports([]);

        const customerId = user?.customerId ?? authUser?.customerId;
        if (customerId) {
          const link = await api.customers.getLink(customerId);
          setCustomerLink(normalizeCustomerLinkState(link));
        }
        setAppDataRevision((revision) => revision + 1);
      } catch (error) {
        console.error("Failed to refresh app data", error);
      }
    },
    [useApi, useSupabase, authUser?.customerId]
  );

  useEffect(() => {
    if (useSupabase) {
      void (async () => {
        try {
          const user = await loadSupabaseSession();
          setAuthUser(user);
          if (user) {
            setRoleState(user.role);
            void refreshAppData(user);
          }
        } catch {
          // Supabase unavailable
        } finally {
          setHydrated(true);
        }
      })();
      return;
    }

    if (useApi) {
      void (async () => {
        try {
          const { user } = await api.auth.session();
          setAuthUser(user);
          if (user) setRoleState(user.role);
          void refreshAppData(user);
        } catch {
          // API unavailable — remain logged out
        } finally {
          setHydrated(true);
        }
      })();
      return;
    }

    const stored = loadFromStorage(STORAGE_KEY_REQUESTS, demoUnlinkRequests);
    const storedRole = loadFromStorage<UserRole | null>(STORAGE_KEY_ROLE, null);
    // One-time hydrate from localStorage (external store) for local/demo mode.
    queueMicrotask(() => {
      setCustomerLink(
        normalizeCustomerLinkState(loadFromStorage(STORAGE_KEY_LINK, initialCustomerLinkState))
      );
      setUnlinkRequests(normalizeUnlinkRequests(stored));
      setMarketplaceApprovals(
        loadFromStorage(MARKETPLACE_APPROVALS_STORAGE_KEY, seedMarketplaceApprovals)
      );
      setLiveMarketplaceDesignerIds(
        loadFromStorage(MARKETPLACE_LIVE_IDS_STORAGE_KEY, DEFAULT_LIVE_DESIGNER_IDS)
      );
      void syncProjects();
      if (storedRole) setRoleState(storedRole);
      setHydrated(true);
    });
  }, [useApi, useSupabase, syncProjects, refreshAppData]);

  useEffect(() => {
    if (!useSupabase) return;
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void (async () => {
        try {
          const user = await loadSupabaseSession();
          setAuthUser(user);
          setRoleState(user?.role ?? null);
          if (user) {
            await refreshAppData(user);
          }
        } catch {
          // Ignore transient auth/network errors during session refresh.
        }
      })();
    });
    return () => subscription.unsubscribe();
  }, [useSupabase, refreshAppData]);

  useEffect(() => {
    const onProjectsUpdated = () => syncProjects();
    const onStorage = (event: StorageEvent) => {
      if (event.key === PROJECTS_STORAGE_KEY) onProjectsUpdated();
    };

    window.addEventListener(PROJECTS_UPDATED_EVENT, onProjectsUpdated);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onProjectsUpdated);

    return () => {
      window.removeEventListener(PROJECTS_UPDATED_EVENT, onProjectsUpdated);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onProjectsUpdated);
    };
  }, [syncProjects]);

  useEffect(() => {
    if (!hydrated || useApi || useSupabase) return;
    saveToStorage(STORAGE_KEY_LINK, customerLink);
  }, [customerLink, hydrated, useApi]);

  useEffect(() => {
    if (!hydrated || useApi || useSupabase) return;
    saveToStorage(STORAGE_KEY_REQUESTS, unlinkRequests);
  }, [unlinkRequests, hydrated, useApi]);

  useEffect(() => {
    if (!hydrated || useApi || useSupabase) return;
    saveToStorage(MARKETPLACE_APPROVALS_STORAGE_KEY, marketplaceApprovals);
  }, [marketplaceApprovals, hydrated, useApi]);

  useEffect(() => {
    if (!hydrated || useApi || useSupabase) return;
    saveToStorage(MARKETPLACE_LIVE_IDS_STORAGE_KEY, liveMarketplaceDesignerIds);
  }, [liveMarketplaceDesignerIds, hydrated, useApi]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3500);
    },
    []
  );

  const clearToast = useCallback(() => setToast(null), []);

  const setRole = useCallback(
    (newRole: UserRole | null) => {
      if ((useApi || useSupabase) && newRole !== null) return;
      setRoleState(newRole);
      if (newRole === null) {
        setAuthUser(null);
        setCustomerLink(initialCustomerLinkState);
        clearSessionStorage();
      } else {
        saveToStorage(STORAGE_KEY_ROLE, newRole);
        void syncProjects();
      }
    },
    [useApi, useSupabase, syncProjects]
  );

  const login = useCallback(
    async (
      email: string,
      password: string,
      options?: { rememberMe?: boolean; captchaToken?: string | null }
    ) => {
      const rememberMe = Boolean(options?.rememberMe);
      if (useSupabase) {
        const user = await supabaseLogin(email, password, {
          captchaToken: options?.captchaToken,
        });
        await startAppSession(rememberMe);
        setAuthUser(user);
        setRoleState(user.role);
        void refreshAppData(user);
        return user;
      }
      const { user } = await api.auth.login(email, password);
      await startAppSession(rememberMe);
      setAuthUser(user);
      setRoleState(user.role);
      void refreshAppData(user);
      return user;
    },
    [useSupabase, refreshAppData]
  );

  const logout = useCallback(async () => {
    if (useSupabase) {
      try {
        await supabaseLogout();
      } catch {
        // Fall through to client cleanup.
      }
    } else if (useApi) {
      try {
        await api.auth.logout();
      } catch {
        // ignore network errors during logout
      }
    }
    clearAppSessionMarkers();
    setAuthUser(null);
    setRoleState(null);
    setCustomerLink(initialCustomerLinkState);
    clearSessionStorage();
  }, [useApi, useSupabase]);

  const linkCustomerToDesigner = useCallback(
    (designerId: string, options?: { source?: "invite" | "marketplace" }) => {
      const designer = appDesigners.find((d) => d.id === designerId);
      const nextLink: CustomerLinkState = {
        linkedDesignerId: designerId,
        linkedDesignerName: designer?.businessName ?? designer?.designerName ?? "Your Designer",
        hasConcludedProject: customerLink.hasConcludedProject,
        unlinkStatus: "none",
        unlinkReason: null,
        unlinkSubmittedAt: null,
        activeUnlinkRequestId: null,
        registrationType:
          options?.source === "invite"
            ? "invited"
            : "direct",
      };

      if ((useSupabase || useApi) && authUser?.customerId) {
        void (async () => {
          const link = useSupabase
            ? await supabaseServices.patchCustomerLink(authUser.customerId!, nextLink)
            : await api.customers.patchLink(authUser.customerId!, nextLink);
          setCustomerLink(normalizeCustomerLinkState(link));
        })();
        return;
      }

      setCustomerLink((prev) => ({
        ...nextLink,
        hasConcludedProject: prev.hasConcludedProject,
        registrationType:
          options?.source === "invite" ? "invited" : prev.registrationType ?? "direct",
      }));
    },
    [useApi, useSupabase, authUser?.customerId, appDesigners, customerLink.hasConcludedProject, customerLink.registrationType]
  );

  const initDirectCustomer = useCallback(() => {
    const direct = createDirectCustomerLinkState();
    if ((useSupabase || useApi) && authUser?.customerId) {
      void (async () => {
        const link = useSupabase
          ? await supabaseServices.patchCustomerLink(authUser.customerId!, direct)
          : await api.customers.patchLink(authUser.customerId!, direct);
        setCustomerLink(normalizeCustomerLinkState(link));
      })();
      return;
    }
    setCustomerLink(direct);
  }, [useApi, useSupabase, authUser]);

  const initDemoCustomer = useCallback(
    (linked = true) => {
      if (useSupabase || useApi) {
        void refreshAppData(authUser);
        return;
      }

      if (!linked) {
        setCustomerLink(createDirectCustomerLinkState());
        return;
      }
    const designer = seedDesigners.find((d) => d.id === DEMO_DESIGNER_ID);
    setUnlinkRequests((requests) => {
      const activeRequest = findActiveRequestForCustomer(requests);
      const approvedRequest = requests.find(
        (r) =>
          (r.customerId === "current" || r.customerName === DEMO_CUSTOMER_NAME) &&
          r.status === "approved"
      );
      const base: CustomerLinkState = {
        linkedDesignerId: approvedRequest ? null : DEMO_DESIGNER_ID,
        linkedDesignerName: approvedRequest ? null : designer?.designerName ?? "Your Designer",
        hasConcludedProject: false,
        unlinkStatus: "none",
        unlinkReason: null,
        unlinkSubmittedAt: null,
        activeUnlinkRequestId: null,
        registrationType: "invited",
      };
      setCustomerLink(syncCustomerLinkFromRequest(base, activeRequest ?? approvedRequest));
      return requests;
    });
  },
  [useApi, useSupabase, authUser, refreshAppData]
);

  const setCustomerHasConcludedProject = useCallback(
    (value: boolean) => {
      if ((useSupabase || useApi) && authUser?.customerId) {
        void (async () => {
          const link = useSupabase
            ? await supabaseServices.patchCustomerLink(authUser.customerId!, {
                hasConcludedProject: value,
              })
            : await api.customers.patchLink(authUser.customerId!, { hasConcludedProject: value });
          setCustomerLink(normalizeCustomerLinkState(link));
        })();
        return;
      }
      setCustomerLink((prev) => ({ ...prev, hasConcludedProject: value }));
    },
    [useApi, useSupabase, authUser]
  );

  const submitUnlinkRequest = useCallback(
    (reason: string) => {
      setCustomerLink((prev) => {
        if (!prev.linkedDesignerId) return prev;

        const submittedAt = formatRequestDate();

        if (useSupabase && authUser?.customerId) {
          void supabaseServices
            .createUnlinkRequest({
              customerLegacyId: authUser.customerId,
              customerName: authUser.name,
              designerLegacyId: prev.linkedDesignerId,
              designerName: prev.linkedDesignerName ?? "Designer",
              reason,
            })
            .then(async () => {
              await refreshAppData(authUser);
            });
        } else if (useApi) {
          const newRequest: UnlinkRequest = {
            id: `ur-${Date.now()}`,
            customerId: authUser?.customerId ?? "current",
            customerName: authUser?.name ?? DEMO_CUSTOMER_NAME,
            designerId: prev.linkedDesignerId,
            designerName: prev.linkedDesignerName ?? "Designer",
            reason,
            submittedAt,
            status: "pending",
            designerConfirmation: null,
          };
          void api.unlinkRequests.create(newRequest).then(async () => {
            await refreshAppData(authUser);
          });
        } else {
          const newRequest: UnlinkRequest = {
            id: `ur-${Date.now()}`,
            customerId: "current",
            customerName: DEMO_CUSTOMER_NAME,
            designerId: prev.linkedDesignerId,
            designerName: prev.linkedDesignerName ?? "Designer",
            reason,
            submittedAt,
            status: "pending",
            designerConfirmation: null,
          };
          setUnlinkRequests((reqs) => [newRequest, ...reqs]);
        }
        showToast("Unlink request sent to admin");

        return {
          ...prev,
          unlinkStatus: "pending",
          unlinkReason: reason,
          unlinkSubmittedAt: submittedAt,
          activeUnlinkRequestId: `ur-${Date.now()}`,
        };
      });
    },
    [useApi, useSupabase, authUser, refreshAppData, showToast]
  );

  const syncCustomerForRequest = useCallback((request: UnlinkRequest) => {
    if (request.customerId !== "current" && request.customerName !== DEMO_CUSTOMER_NAME) return;
    setCustomerLink((prev) => syncCustomerLinkFromRequest(prev, request));
  }, []);

  const adminSendDesignerConfirmation = useCallback(
    (requestId: string, notes?: string) => {
      const contactedAt = formatRequestDate();
      const patch = {
        status: "designer_review" as UnlinkRequestStatus,
        adminNotes: notes,
        adminContactedAt: contactedAt,
        designerConfirmation: "awaiting" as const,
        designerResponse: undefined,
        designerRespondedAt: undefined,
      };

      if (useSupabase || useApi) {
        void (useSupabase
          ? supabaseServices.updateUnlinkRequest(requestId, patch).then(() => refreshAppData(authUser))
          : api.unlinkRequests.update(requestId, patch).then(() => refreshAppData(authUser))
        );
        showToast("Confirmation request sent to designer");
        return;
      }

      setUnlinkRequests((prev) => {
        const updated = prev.map((r) =>
          r.id === requestId ? normalizeUnlinkRequest({ ...r, ...patch }) : r
        );
        const request = updated.find((r) => r.id === requestId);
        if (request) syncCustomerForRequest(request);
        return updated;
      });

      showToast("Confirmation request sent to designer");
    },
    [useApi, useSupabase, authUser, refreshAppData, showToast, syncCustomerForRequest]
  );

  const designerRespondToUnlink = useCallback(
    (requestId: string, confirmed: boolean, response: string) => {
      const respondedAt = formatRequestDate();
      const patch = {
        designerConfirmation: confirmed ? ("confirmed" as const) : ("disputed" as const),
        designerResponse: response,
        designerRespondedAt: respondedAt,
      };

      if (useSupabase || useApi) {
        void (useSupabase
          ? supabaseServices.updateUnlinkRequest(requestId, patch).then(() => refreshAppData(authUser))
          : api.unlinkRequests.update(requestId, patch).then(() => refreshAppData(authUser))
        );
      } else {
        setUnlinkRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, ...patch } : r))
        );
      }

      showToast(
        confirmed
          ? "You confirmed the unlink request — admin will finalise"
          : "You disputed the unlink request — admin will review"
      );
    },
    [useApi, authUser, refreshAppData, showToast]
  );

  const adminApproveUnlink = useCallback(
    (requestId: string) => {
      if (useSupabase || useApi) {
        void (useSupabase
          ? supabaseServices
              .updateUnlinkRequest(requestId, { status: "approved" })
              .then(() => refreshAppData(authUser))
          : api.unlinkRequests
              .update(requestId, { status: "approved" as UnlinkRequestStatus })
              .then(() => refreshAppData(authUser))
        );
        showToast("Unlink approved — client can access marketplace");
        return;
      }

      setUnlinkRequests((prev) => {
        const updated = prev.map((r) =>
          r.id === requestId ? { ...r, status: "approved" as UnlinkRequestStatus } : r
        );
        const request = updated.find((r) => r.id === requestId);
        if (request) syncCustomerForRequest(request);
        return updated;
      });
      showToast("Unlink approved — client can access marketplace");
    },
    [useApi, authUser, refreshAppData, showToast, syncCustomerForRequest]
  );

  const adminDeclineUnlink = useCallback(
    (requestId: string, notes?: string) => {
      if (useSupabase || useApi) {
        void (useSupabase
          ? supabaseServices
              .updateUnlinkRequest(requestId, {
                status: "declined",
                adminNotes: notes,
              })
              .then(() => refreshAppData(authUser))
          : api.unlinkRequests
              .update(requestId, {
                status: "declined" as UnlinkRequestStatus,
                adminNotes: notes,
              })
              .then(() => refreshAppData(authUser))
        );
        showToast("Unlink request declined", "error");
        return;
      }

      setUnlinkRequests((prev) => {
        const updated = prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: "declined" as UnlinkRequestStatus,
                adminNotes: notes || r.adminNotes,
              }
            : r
        );
        const request = updated.find((r) => r.id === requestId);
        if (request) syncCustomerForRequest(request);
        return updated;
      });
      showToast("Unlink request declined", "error");
    },
    [useApi, authUser, refreshAppData, showToast, syncCustomerForRequest]
  );

  const getDesignerPendingConfirmations = useCallback(() => {
    return getDesignerUnlinkQueue(unlinkRequests);
  }, [unlinkRequests]);

  const updateProjectStatus = useCallback(
    (projectId: string, status: ProjectStatus) => {
      if (useSupabase) {
        void supabaseServices.updateProjectStatus(projectId, status).then((updated) => {
          setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
          setProjectsReady(true);
          if (status === "Completed") {
            if (updated.customerId && updated.customerId === authUser?.customerId) {
              setCustomerHasConcludedProject(true);
            }
          }
      showToast(
            status === "Delivered" ||
              status === "Awaiting Customer Confirmation" ||
              status === "Re-delivered"
              ? status === "Re-delivered"
                ? "Marked as re-delivered — awaiting client confirmation."
                : "Marked as delivered — awaiting client confirmation."
              : `Timeline updated: ${status}`
          );
        });
        return;
      }
      if (useApi) {
        void api.projects.updateStatus(projectId, status).then(async (updated) => {
          setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
          setProjectsReady(true);
          if (status === "Delivered" && updated.customerId === authUser?.customerId) {
            setCustomerHasConcludedProject(true);
          }
          showToast(`Timeline updated: ${status}`);
        });
        return;
      }

      const updated = updateProjectStatusInStore(projectId, status);
      setProjects(updated);
      setProjectsReady(true);
      const target = updated.find((p) => p.id === projectId);
      if (status === "Delivered" && target?.customerName === DEMO_CUSTOMER_NAME) {
        setCustomerHasConcludedProject(true);
      }
      showToast(`Timeline updated: ${status}`);
    },
    [useApi, useSupabase, authUser?.customerId, showToast, setCustomerHasConcludedProject]
  );

  const addCustomerReference = useCallback(
    (projectId: string, reference: CustomerReference) => {
      if (useSupabase) {
        void supabaseServices.addCustomerReference(projectId, reference).then((updated) => {
          if (!updated) return;
          setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
          setProjectsReady(true);
          showToast("Reference uploaded for your designer");
        });
        return;
      }
      if (useApi) {
        void api.projects.addReference(projectId, reference).then((updated) => {
          setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
          setProjectsReady(true);
          showToast("Reference uploaded for your designer");
        });
        return;
      }

      const updated = addCustomerReferenceToStore(projectId, reference);
      setProjects(updated);
      setProjectsReady(true);
      showToast("Reference uploaded for your designer");
    },
    [useApi, useSupabase, showToast]
  );

  const removeCustomerReference = useCallback(
    (projectId: string, referenceId: string) => {
      if (useSupabase) {
        void supabaseServices.removeCustomerReference(projectId, referenceId).then((updated) => {
          if (!updated) return;
          setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
          setProjectsReady(true);
          showToast("Reference removed");
        });
        return;
      }
      if (useApi) {
        void api.projects.removeReference(projectId, referenceId).then((updated) => {
          setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
          setProjectsReady(true);
          showToast("Reference removed");
        });
        return;
      }

      const updated = removeCustomerReferenceFromStore(projectId, referenceId);
      setProjects(updated);
      setProjectsReady(true);
      showToast("Reference removed");
    },
    [useApi, useSupabase, showToast]
  );

  const addProjectGalleryImage = useCallback(
    (projectId: string, imageUrl: string) => {
      if (useSupabase) {
        void supabaseServices.appendProjectGalleryImage(projectId, imageUrl).then((updated) => {
          if (!updated) return;
          setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
          setProjectsReady(true);
          showToast("Progress photo shared with client");
        });
        return;
      }
      showToast("Progress photo saved");
    },
    [useSupabase, showToast]
  );

  const getPendingMarketplaceApprovals = useCallback(() => {
    return getPendingApprovals(marketplaceApprovals);
  }, [marketplaceApprovals]);

  const getDesignerById = useCallback(
    (id: string) => appDesigners.find((d) => d.id === id),
    [appDesigners]
  );

  const getLiveMarketplaceDesigners = useCallback(() => {
    return appDesigners.filter((d) => liveMarketplaceDesignerIds.includes(d.id));
  }, [appDesigners, liveMarketplaceDesignerIds]);

  const isDesignerMarketplaceLive = useCallback(
    (designerId: string) => isDesignerLive(liveMarketplaceDesignerIds, designerId),
    [liveMarketplaceDesignerIds]
  );

  const submitMarketplaceApprovalRequest = useCallback(
    (designerId: string) => {
      const designer = appDesigners.find((d) => d.id === designerId);
      if (!designer) return;

      if (hasPendingApprovalForDesigner(marketplaceApprovals, designerId)) {
        showToast("Marketplace listing already pending review");
        return;
      }

      if (isDesignerLive(liveMarketplaceDesignerIds, designerId)) {
        showToast("Your profile is already live on the marketplace");
        return;
      }

      const newApproval: MarketplaceApproval = {
        id: `ma-${Date.now()}`,
        designerId,
        designerName: designer.designerName,
        businessName: designer.businessName,
        specialty: designer.specialty,
        submittedAt: formatRequestDate(),
        status: "pending",
      };

      if (useSupabase) {
        void supabaseServices
          .submitMarketplaceListing({
            designerLegacyId: designerId,
            designerName: designer.designerName,
            businessName: designer.businessName,
            specialty: designer.specialty,
          })
          .then(() => refreshAppData(authUser));
      } else if (useApi) {
        void api.marketplace.createApproval(newApproval).then(async () => {
          await refreshAppData(authUser);
        });
      } else {
        setMarketplaceApprovals((prev) => [newApproval, ...prev]);
      }
      showToast("Marketplace listing submitted for admin approval");
    },
    [useApi, useSupabase, authUser, marketplaceApprovals, liveMarketplaceDesignerIds, refreshAppData, showToast, appDesigners]
  );

  const setDesignerMarketplaceVisibility = useCallback(
    (designerId: string, visible: boolean) => {
      if (!visible) {
        if (useSupabase && authUser?.designerId) {
          void supabaseServices
            .resolveDesignerProfileId(designerId)
            .then((profileId) => {
              if (!profileId) return;
              return supabaseServices.setDesignerMarketplaceLive(profileId, false);
            })
            .then(() => refreshAppData(authUser));
        } else if (useApi) {
          void api.designers.setMarketplaceLive(designerId, false).then(async (ids) => {
            setLiveMarketplaceDesignerIds(ids);
            await refreshAppData(authUser);
          });
        } else {
          setLiveMarketplaceDesignerIds((prev) => prev.filter((id) => id !== designerId));
          setMarketplaceApprovals((prev) =>
            prev.map((a) =>
              a.designerId === designerId && a.status === "pending"
                ? { ...a, status: "declined" as const }
                : a
            )
          );
        }
        showToast("Marketplace listing withdrawn");
        return;
      }

      if (isDesignerLive(liveMarketplaceDesignerIds, designerId)) return;
      submitMarketplaceApprovalRequest(designerId);
    },
    [useApi, useSupabase, authUser, liveMarketplaceDesignerIds, submitMarketplaceApprovalRequest, refreshAppData, showToast]
  );

  const adminApproveMarketplace = useCallback(
    (approvalId: string, adminNotes?: string) => {
      const target = marketplaceApprovals.find((a) => a.id === approvalId);
      if (!target || target.status !== "pending") return;

      if (useSupabase) {
        void supabaseServices
          .updateMarketplaceListing(approvalId, {
            status: "approved",
            adminNotes: adminNotes || target.adminNotes,
          })
          .then(() => refreshAppData(authUser));
        showToast("Marketplace listing approved after verification");
        return;
      }
      if (useApi) {
        void api.marketplace
          .updateApproval(approvalId, {
            status: "approved",
            adminNotes: adminNotes || target.adminNotes,
          })
          .then(async () => {
            await refreshAppData(authUser);
          });
        showToast("Marketplace listing approved after verification");
        return;
      }

      if (appDesigners.some((d) => d.id === target.designerId)) {
        setLiveMarketplaceDesignerIds((ids) =>
          ids.includes(target.designerId) ? ids : [...ids, target.designerId]
        );
      }

      setMarketplaceApprovals((prev) =>
        prev.map((a) =>
          a.id === approvalId
            ? { ...a, status: "approved" as const, adminNotes: adminNotes || a.adminNotes }
            : a
        )
      );
      showToast("Marketplace listing approved after verification");
    },
    [useApi, authUser, marketplaceApprovals, refreshAppData, showToast, appDesigners]
  );

  const adminDeclineMarketplace = useCallback(
    (approvalId: string, reason?: string) => {
      if (useSupabase) {
        void supabaseServices
          .updateMarketplaceListing(approvalId, { status: "declined", declineReason: reason })
          .then(() => refreshAppData(authUser));
        showToast("Marketplace listing declined", "error");
        return;
      }
      if (useApi) {
        void api.marketplace
          .updateApproval(approvalId, { status: "declined", declineReason: reason })
          .then(async () => {
            await refreshAppData(authUser);
          });
        showToast("Marketplace listing declined", "error");
        return;
      }

      setMarketplaceApprovals((prev) =>
        prev.map((a) =>
          a.id === approvalId
            ? { ...a, status: "declined" as const, declineReason: reason || a.declineReason }
            : a
        )
      );
      showToast("Marketplace listing declined", "error");
    },
    [useApi, authUser, refreshAppData, showToast]
  );

  const adminDismissReport = useCallback(
    async (reportId: string) => {
      if (useSupabase) {
        await supabaseServices.dismissReport(reportId);
        await refreshAppData();
        showToast("Report dismissed");
        return;
      }

      setUserReports((prev) =>
        prev.map((report) =>
          report.id === reportId ? { ...report, status: "dismissed" as const } : report
        )
      );
      showToast("Report dismissed");
    },
    [useSupabase, refreshAppData, showToast]
  );

  const adminSuspendReportedUser = useCallback(
    async (reportId: string) => {
      if (useSupabase) {
        await supabaseServices.suspendReportedUser(reportId);
        await refreshAppData();
        showToast("Account suspended and report resolved");
        return;
      }

      setUserReports((prev) =>
        prev.map((report) =>
          report.id === reportId ? { ...report, status: "resolved" as const } : report
        )
      );
      showToast("Account suspended and report resolved");
    },
    [useSupabase, refreshAppData, showToast]
  );

  const adminBanReportedUser = useCallback(
    async (reportId: string) => {
      if (useSupabase) {
        await supabaseServices.banReportedUser(reportId);
        await refreshAppData();
        showToast("Account banned and report resolved");
        return;
      }

      setUserReports((prev) =>
        prev.map((report) =>
          report.id === reportId ? { ...report, status: "resolved" as const } : report
        )
      );
      showToast("Account banned and report resolved");
    },
    [useSupabase, refreshAppData, showToast]
  );

  const adminSetDesignerMarketplaceLive = useCallback(
    async (designerId: string, live: boolean) => {
      if (useSupabase) {
        await supabaseServices.adminSetDesignerMarketplaceLive(designerId, live);
        await refreshAppData();
        showToast(live ? "Designer is now live on the marketplace" : "Designer removed from marketplace");
        return;
      }
      if (useApi) {
        const ids = await api.designers.setMarketplaceLive(designerId, live);
        setLiveMarketplaceDesignerIds(ids);
        await refreshAppData();
        showToast(live ? "Designer is now live on the marketplace" : "Designer removed from marketplace");
        return;
      }

      setLiveMarketplaceDesignerIds((prev) =>
        live
          ? prev.includes(designerId)
            ? prev
            : [...prev, designerId]
          : prev.filter((id) => id !== designerId)
      );
      showToast(live ? "Designer is now live on the marketplace" : "Designer removed from marketplace");
    },
    [useApi, useSupabase, refreshAppData, showToast]
  );

  const submitTestimonial = useCallback(
    async (input: SubmitTestimonialPayload) => {
      if (!authUser?.customerId) throw new Error("Sign in as a client to leave a testimonial.");
      let photoUrl = input.photoUrl;
      if (input.photoFile && useSupabase && authUser.id) {
        photoUrl = await supabaseServices.uploadTestimonialPhoto(authUser.id, input.photoFile);
      }
      await supabaseServices.submitTestimonial(
        {
          projectId: input.projectId,
          rating: input.rating,
          body: input.body,
          outfitType: input.outfitType,
          photoUrl,
          allowPublic: input.allowPublic,
          showName: input.showName,
          showLocation: input.showLocation,
          privateFeedback: input.privateFeedback,
          customerFirstName: input.customerFirstName,
          customerLocation: input.customerLocation,
        },
        authUser.customerId,
        input.designerLegacyId
      );
      if (!useSupabase) {
        setTestimonials(readTestimonialsFromStorage());
      }
      await refreshAppData(authUser);
    },
    [authUser, refreshAppData, useSupabase]
  );

  const requestProjectTestimonial = useCallback(
    async (projectId: string) => {
      if (!authUser?.designerId) throw new Error("Designer account required.");
      await supabaseServices.requestProjectTestimonial(projectId, authUser.designerId);
      await refreshAppData(authUser);
    },
    [authUser, refreshAppData]
  );

  const hideTestimonialFromProfile = useCallback(
    async (testimonialId: string, hidden: boolean) => {
      await supabaseServices.setTestimonialHidden(testimonialId, hidden);
      if (!useSupabase) setTestimonials(readTestimonialsFromStorage());
      await refreshAppData(authUser);
    },
    [authUser, refreshAppData, useSupabase]
  );

  const reportTestimonial = useCallback(
    async (testimonialId: string, reason: string, detail: string) => {
      if (!authUser?.id) throw new Error("Sign in to report a testimonial.");
      await supabaseServices.reportTestimonial(testimonialId, authUser.id, reason, detail);
      if (!useSupabase) setTestimonialReports(readTestimonialReportsFromStorage());
      await refreshAppData(authUser);
    },
    [authUser, refreshAppData, useSupabase]
  );

  const adminRemoveTestimonial = useCallback(
    async (testimonialId: string) => {
      await supabaseServices.adminRemoveTestimonial(testimonialId);
      if (!useSupabase) setTestimonials(readTestimonialsFromStorage());
      await refreshAppData(authUser);
    },
    [authUser, refreshAppData, useSupabase]
  );

  const adminResolveTestimonialReport = useCallback(
    async (reportId: string, status: "dismissed" | "resolved") => {
      await supabaseServices.adminResolveTestimonialReport(reportId, status);
      if (!useSupabase) setTestimonialReports(readTestimonialReportsFromStorage());
      await refreshAppData(authUser);
    },
    [authUser, refreshAppData, useSupabase]
  );

  const confirmProjectDelivery = useCallback(
    async (projectId: string) => {
      if (!authUser?.customerId) throw new Error("Sign in as a client to confirm delivery.");
      const updated = await supabaseServices.confirmProjectDelivery(projectId, authUser.customerId);
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
      setProjectsReady(true);
      setAppDataRevision((revision) => revision + 1);
      setCustomerHasConcludedProject(true);
      if (!useSupabase) setDeliveryIssues(readDeliveryIssuesFromStorage());
      await refreshAppData(authUser);
    },
    [authUser, refreshAppData, setCustomerHasConcludedProject, useSupabase]
  );

  const reportProjectDeliveryIssue = useCallback(
    async (input: { projectId: string; issueType: DeliveryIssueType; detail: string }) => {
      if (!authUser?.customerId) throw new Error("Sign in as a client to report an issue.");
      const result = await supabaseServices.reportProjectDeliveryIssue({
        ...input,
        customerLegacyId: authUser.customerId,
      });
      setProjects((prev) => prev.map((p) => (p.id === input.projectId ? result.project : p)));
      setProjectsReady(true);
      setAppDataRevision((revision) => revision + 1);
      setDeliveryIssues((prev) => [result.issue, ...prev.filter((item) => item.id !== result.issue.id)]);
      if (!useSupabase) setDeliveryIssues(readDeliveryIssuesFromStorage());
      await refreshAppData(authUser);
    },
    [authUser, refreshAppData, useSupabase]
  );

  const respondToDeliveryIssue = useCallback(
    async (input: {
      issueId: string;
      response: string;
      projectStatus?: ProjectStatus;
      markResolved?: boolean;
    }) => {
      if (!authUser?.designerId) throw new Error("Designer account required.");
      const result = await supabaseServices.respondToDeliveryIssue({
        issueId: input.issueId,
        designerLegacyId: authUser.designerId,
        response: input.response,
        projectStatus: input.projectStatus,
        markResolved: input.markResolved,
      });
      setDeliveryIssues((prev) =>
        prev.map((item) => (item.id === result.issue.id ? result.issue : item))
      );
      if (result.project) {
        setProjects((prev) =>
          prev.map((p) => (p.id === result.project!.id ? result.project! : p))
        );
        setProjectsReady(true);
      }
      if (!useSupabase) setDeliveryIssues(readDeliveryIssuesFromStorage());
      await refreshAppData(authUser);
    },
    [authUser, refreshAppData, useSupabase]
  );

  const redeliverProject = useCallback(
    async (projectId: string) => {
      const updated = await supabaseServices.redeliverProject(projectId);
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
      setProjectsReady(true);
      if (!useSupabase) setDeliveryIssues(readDeliveryIssuesFromStorage());
      await refreshAppData(authUser);
    },
    [authUser, refreshAppData, useSupabase]
  );

  const canAccessMarketplace =
    role !== "customer" || canCustomerAccessMarketplace(customerLink);

  const refreshAppDataPublic = useCallback(async () => {
    await refreshAppData(authUser);
  }, [authUser, refreshAppData]);

  return (
    <AppContext.Provider
      value={{
        role,
        authUser,
        hydrated,
        setRole,
        login,
        logout,
        measurementUnit,
        setMeasurementUnit,
        toast,
        showToast,
        clearToast,
        customerLink,
        linkCustomerToDesigner,
        setCustomerHasConcludedProject,
        submitUnlinkRequest,
        canAccessMarketplace,
        unlinkRequests,
        adminSendDesignerConfirmation,
        designerRespondToUnlink,
        adminApproveUnlink,
        adminDeclineUnlink,
        initDemoCustomer,
        initDirectCustomer,
        getDesignerPendingConfirmations,
        projects,
        projectsReady,
        designers: appDesigners,
        customers: appCustomers,
        getDesignerById,
        syncProjects,
        updateProjectStatus,
        addCustomerReference,
        removeCustomerReference,
        addProjectGalleryImage,
        marketplaceApprovals,
        liveMarketplaceDesignerIds,
        getPendingMarketplaceApprovals,
        getLiveMarketplaceDesigners,
        isDesignerMarketplaceLive,
        submitMarketplaceApprovalRequest,
        setDesignerMarketplaceVisibility,
        adminApproveMarketplace,
        adminDeclineMarketplace,
        adminDismissReport,
        adminSuspendReportedUser,
        adminBanReportedUser,
        adminSetDesignerMarketplaceLive,
        refreshAppData: refreshAppDataPublic,
        appDataRevision,
        userReports,
        studioClients,
        appointments,
        groupProjects,
        testimonials,
        testimonialReports,
        submitTestimonial,
        requestProjectTestimonial,
        hideTestimonialFromProfile,
        reportTestimonial,
        adminRemoveTestimonial,
        adminResolveTestimonialReport,
        deliveryIssues,
        confirmProjectDelivery,
        reportProjectDeliveryIssue,
        respondToDeliveryIssue,
        redeliverProject,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
