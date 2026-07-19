import type { UserRole } from "@/lib/design-tokens";
import { isApiEnabled } from "@/lib/config/backend";

export { isApiEnabled };

type ApiEnvelope<T> = { data: T } | { error: string };

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  accountStatus?: "active" | "suspended" | "banned";
  profileImage?: string;
  customerId?: string;
  designerId?: string;
  emailConfirmed?: boolean;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || "error" in payload) {
    throw new Error("error" in payload ? payload.error : `Request failed (${response.status})`);
  }
  return payload.data;
}

export const api = {
  health: () => apiFetch<{ status: string; database: string }>("/api/health"),
  auth: {
    session: () => apiFetch<{ user: AuthUser | null }>("/api/v1/auth/session"),
    login: (email: string, password: string) =>
      apiFetch<{ user: AuthUser }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    logout: () => apiFetch<{ ok: boolean }>("/api/v1/auth/session", { method: "DELETE" }),
  },
  projects: {
    list: () => apiFetch<import("@/lib/mock-data").Project[]>("/api/v1/projects"),
    get: (id: string) => apiFetch<import("@/lib/mock-data").Project>(`/api/v1/projects/${id}`),
    updateStatus: (id: string, status: import("@/lib/design-tokens").ProjectStatus) =>
      apiFetch<import("@/lib/mock-data").Project>(`/api/v1/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    addReference: (
      id: string,
      reference: import("@/lib/customer-references").CustomerReference
    ) =>
      apiFetch<import("@/lib/mock-data").Project>(`/api/v1/projects/${id}/references`, {
        method: "POST",
        body: JSON.stringify(reference),
      }),
    removeReference: (projectId: string, referenceId: string) =>
      apiFetch<import("@/lib/mock-data").Project>(
        `/api/v1/projects/${projectId}/references/${referenceId}`,
        { method: "DELETE" }
      ),
  },
  designers: {
    list: () => apiFetch<import("@/lib/mock-data").Designer[]>("/api/v1/designers"),
    get: (id: string) => apiFetch<import("@/lib/mock-data").Designer>(`/api/v1/designers/${id}`),
    setMarketplaceLive: (id: string, live: boolean) =>
      apiFetch<string[]>(`/api/v1/designers/${id}/marketplace`, {
        method: "PATCH",
        body: JSON.stringify({ live }),
      }),
  },
  customers: {
    list: () => apiFetch<import("@/lib/mock-data").Customer[]>("/api/v1/customers"),
    getLink: (id: string) =>
      apiFetch<import("@/lib/customer-access").CustomerLinkState>(`/api/v1/customers/${id}/link`),
    patchLink: (id: string, patch: Partial<import("@/lib/customer-access").CustomerLinkState>) =>
      apiFetch<import("@/lib/customer-access").CustomerLinkState>(`/api/v1/customers/${id}/link`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
  },
  invites: {
    list: (designerId = "1") =>
      apiFetch<import("@/lib/mock-data").PendingInvite[]>(
        `/api/v1/invites?designerId=${designerId}`
      ),
  },
  unlinkRequests: {
    list: () => apiFetch<import("@/lib/customer-access").UnlinkRequest[]>("/api/v1/unlink-requests"),
    create: (body: import("@/lib/customer-access").UnlinkRequest) =>
      apiFetch<import("@/lib/customer-access").UnlinkRequest>("/api/v1/unlink-requests", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, patch: Partial<import("@/lib/customer-access").UnlinkRequest>) =>
      apiFetch<import("@/lib/customer-access").UnlinkRequest>(`/api/v1/unlink-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
  },
  marketplace: {
    approvals: () =>
      apiFetch<import("@/lib/marketplace-approvals").MarketplaceApproval[]>(
        "/api/v1/marketplace/approvals"
      ),
    createApproval: (body: import("@/lib/marketplace-approvals").MarketplaceApproval) =>
      apiFetch<import("@/lib/marketplace-approvals").MarketplaceApproval>(
        "/api/v1/marketplace/approvals",
        { method: "POST", body: JSON.stringify(body) }
      ),
    updateApproval: (
      id: string,
      patch: Partial<import("@/lib/marketplace-approvals").MarketplaceApproval>
    ) =>
      apiFetch<import("@/lib/marketplace-approvals").MarketplaceApproval>(
        `/api/v1/marketplace/approvals/${id}`,
        { method: "PATCH", body: JSON.stringify(patch) }
      ),
    liveDesignerIds: () => apiFetch<string[]>("/api/v1/marketplace/live"),
  },
  conversations: {
    list: (filters?: { designerId?: string; customerId?: string; createDesigner?: string }) => {
      const params = new URLSearchParams();
      if (filters?.designerId) params.set("designerId", filters.designerId);
      if (filters?.customerId) params.set("customerId", filters.customerId);
      if (filters?.createDesigner) params.set("createDesigner", filters.createDesigner);
      const query = params.toString();
      return apiFetch<import("@/lib/conversations").Conversation[]>(
        `/api/v1/conversations${query ? `?${query}` : ""}`
      );
    },
    get: (id: string) =>
      apiFetch<import("@/lib/conversations").Conversation>(`/api/v1/conversations/${id}`),
    createDesignerThread: (designerId: string) =>
      apiFetch<import("@/lib/conversations").Conversation>("/api/v1/conversations", {
        method: "POST",
        body: JSON.stringify({ designerId }),
      }),
    sendMessage: (
      conversationId: string,
      body: Pick<import("@/lib/conversations").ThreadMessage, "text" | "sender" | "senderName"> & {
        attachments?: import("@/lib/conversations").ThreadMessage["attachments"];
      }
    ) =>
      apiFetch<import("@/lib/conversations").ThreadMessage>(
        `/api/v1/conversations/${conversationId}/messages`,
        { method: "POST", body: JSON.stringify(body) }
      ),
  },
  measurements: {
    get: (customerId: string) =>
      apiFetch<import("@/lib/customer-measurements").CustomerMeasurementProfile>(
        `/api/v1/measurements?customerId=${customerId}`
      ),
    save: (
      customerId: string,
      patch: Partial<Omit<import("@/lib/customer-measurements").CustomerMeasurementProfile, "customerId">>
    ) =>
      apiFetch<import("@/lib/customer-measurements").CustomerMeasurementProfile>(
        "/api/v1/measurements",
        { method: "PATCH", body: JSON.stringify({ customerId, ...patch }) }
      ),
    updateProject: (projectId: string, measurements: Record<string, string>) =>
      apiFetch<import("@/lib/mock-data").Project>(`/api/v1/projects/${projectId}/measurements`, {
        method: "PATCH",
        body: JSON.stringify({ measurements }),
      }),
  },
};
