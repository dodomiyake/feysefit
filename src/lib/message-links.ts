import type { Project } from "@/lib/mock-data";

export function conversationMessageHref(conversationId: string): string {
  if (conversationId.startsWith("designer-")) {
    return `/messages?designer=${encodeURIComponent(conversationId.replace("designer-", ""))}`;
  }
  return `/messages?thread=${encodeURIComponent(conversationId)}`;
}

export function clientMessageThreadHref(customerId: string): string {
  return conversationMessageHref(`client-${customerId}`);
}

export function projectMessageThreadHref(projectId: string): string {
  return conversationMessageHref(`project-${projectId}`);
}

export function designerMessageThreadHref(designerId: string): string {
  return `/messages?designer=${encodeURIComponent(designerId)}`;
}

/** Prefer a project thread when the client already has projects (matches inbox list). */
export function customerMessageThreadHref(customerId: string, projects: Project[] = []): string {
  const customerProjects = projects.filter((project) => project.customerId === customerId);
  if (customerProjects.length === 0) return clientMessageThreadHref(customerId);

  const latest = customerProjects.reduce((current, candidate) => {
    const currentTime = Date.parse(current.updatedAt ?? current.lastUpdated ?? "") || 0;
    const candidateTime = Date.parse(candidate.updatedAt ?? candidate.lastUpdated ?? "") || 0;
    return candidateTime > currentTime ? candidate : current;
  });

  return projectMessageThreadHref(latest.id);
}

export function messageThreadWithDraft(conversationId: string, draft: string): string {
  const params = new URLSearchParams();
  if (conversationId.startsWith("designer-")) {
    params.set("designer", conversationId.replace("designer-", ""));
  } else {
    params.set("thread", conversationId);
  }
  params.set("draft", draft);
  return `/messages?${params.toString()}`;
}

export function scheduleFittingMessageHref(projectId: string, designerFirstName?: string): string {
  const greeting = designerFirstName?.trim() ? `Hi ${designerFirstName.trim()}` : "Hi";
  const draft = `${greeting}, I'd like to schedule a fitting. What dates and times work for you?`;
  return messageThreadWithDraft(`project-${projectId}`, draft);
}
