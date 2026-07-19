import type { CustomerReference } from "@/lib/customer-references";
import type { ProjectStatus } from "@/lib/design-tokens";
import type { Project } from "@/lib/mock-data";
import { formatTimelineCustomerUpdate, formatReferenceDesignerUpdate } from "@/lib/project-updates";
import { projects as seedProjects } from "@/lib/mock-data";

export const PROJECTS_STORAGE_KEY = "feysefit_projects";
const LEGACY_SESSION_KEY = "feysefit_projects";
export const PROJECTS_UPDATED_EVENT = "feysefit-projects-updated";

function parseProjects(raw: string | null): Project[] {
  if (!raw) return seedProjects;
  try {
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedProjects;
  } catch {
    return seedProjects;
  }
}

export function readProjectsFromStorage(): Project[] {
  if (typeof window === "undefined") return seedProjects;

  try {
    const fromLocal = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (fromLocal) return parseProjects(fromLocal);

    const fromSession = sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (fromSession) {
      localStorage.setItem(PROJECTS_STORAGE_KEY, fromSession);
      sessionStorage.removeItem(LEGACY_SESSION_KEY);
      return parseProjects(fromSession);
    }
  } catch {
    // fall through
  }

  return seedProjects;
}

export function saveProjects(projects: Project[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    window.dispatchEvent(new Event(PROJECTS_UPDATED_EVENT));
  } catch {
    // ignore quota / privacy errors
  }
}

export function updateProjectStatusInStore(
  projectId: string,
  status: ProjectStatus
): Project[] {
  const current = readProjectsFromStorage();
  const lastUpdated = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const updated = current.map((project) =>
    project.id === projectId
      ? {
          ...project,
          status,
          customerUpdate: formatTimelineCustomerUpdate(status),
          lastUpdated,
        }
      : project
  );
  saveProjects(updated);
  return updated;
}

export function getProjectById(projectId: string): Project | undefined {
  return readProjectsFromStorage().find((project) => project.id === projectId);
}

export function addCustomerReferenceToStore(
  projectId: string,
  reference: CustomerReference
): Project[] {
  const current = readProjectsFromStorage();
  const lastUpdated = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const updated = current.map((project) =>
    project.id === projectId
      ? {
          ...project,
          customerReferences: [...(project.customerReferences ?? []), reference],
          designerUpdate: formatReferenceDesignerUpdate(project.customerName, reference.category),
          lastUpdated,
        }
      : project
  );
  saveProjects(updated);
  return updated;
}

export function removeCustomerReferenceFromStore(
  projectId: string,
  referenceId: string
): Project[] {
  const current = readProjectsFromStorage();
  const updated = current.map((project) =>
    project.id === projectId
      ? {
          ...project,
          customerReferences: (project.customerReferences ?? []).filter(
            (ref) => ref.id !== referenceId
          ),
        }
      : project
  );
  saveProjects(updated);
  return updated;
}

export function updateProjectFabricsInStore(
  projectId: string,
  patch: {
    primaryFabric?: string;
    secondaryMaterial?: string;
    lining?: string;
    designerFabricAdvice?: string;
    customerUpdate?: string;
    designerUpdate?: string;
  }
): Project[] {
  const current = readProjectsFromStorage();
  const lastUpdated = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const updated = current.map((project) =>
    project.id === projectId
      ? {
          ...project,
          ...(patch.primaryFabric !== undefined ? { primaryFabric: patch.primaryFabric } : {}),
          ...(patch.secondaryMaterial !== undefined
            ? { secondaryMaterial: patch.secondaryMaterial }
            : {}),
          ...(patch.lining !== undefined ? { lining: patch.lining } : {}),
          ...(patch.designerFabricAdvice !== undefined
            ? { designerFabricAdvice: patch.designerFabricAdvice }
            : {}),
          ...(patch.customerUpdate !== undefined ? { customerUpdate: patch.customerUpdate } : {}),
          ...(patch.designerUpdate !== undefined ? { designerUpdate: patch.designerUpdate } : {}),
          lastUpdated,
        }
      : project
  );
  saveProjects(updated);
  return updated;
}
