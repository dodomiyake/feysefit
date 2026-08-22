"use client";

import type { Project } from "@/lib/mock-data";
import { useApp } from "@/context/AppContext";
import { isActiveCommission } from "@/lib/project-delivery";

function pickActiveProject(candidates: Project[]): Project | null {
  const active = candidates.filter((project) => isActiveCommission(project.status));
  if (!active.length) return null;

  const sorted = [...active].sort((a, b) => {
    const aTime = a.updatedAt ?? a.createdAt ?? "";
    const bTime = b.updatedAt ?? b.createdAt ?? "";
    return bTime.localeCompare(aTime);
  });

  return sorted[0] ?? null;
}

export function useCustomerActiveProject(): Project | null {
  const { projects, authUser, role } = useApp();
  if (!projects.length) return null;

  // RLS already scopes projects to the logged-in customer in Supabase mode.
  if (role === "customer") {
    return pickActiveProject(projects);
  }

  if (authUser?.customerId) {
    const byId = projects.filter((p) => p.customerId === authUser.customerId);
    if (byId.length) return pickActiveProject(byId);
  }

  if (authUser?.name) {
    const byName = projects.filter((p) => p.customerName === authUser.name);
    if (byName.length) return pickActiveProject(byName);
  }

  return null;
}

/** Sidebar / nav target for a customer's project (falls back to dashboard when none). */
export function useCustomerProjectsHref(): string {
  const { hydrated, projectsReady } = useApp();
  const activeProject = useCustomerActiveProject();

  if (!hydrated || !projectsReady) {
    return "/projects";
  }

  return activeProject ? `/projects/${activeProject.id}` : "/projects";
}
