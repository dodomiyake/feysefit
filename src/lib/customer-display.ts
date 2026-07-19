import type { Customer, Project } from "@/lib/mock-data";
import type { AuthUser } from "@/lib/api/client";

export function getCustomerInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

export function resolveCurrentCustomer(
  customers: Customer[],
  authUser?: AuthUser | null
): Customer | undefined {
  if (!customers.length) return undefined;

  if (authUser?.customerId) {
    const byId = customers.find((customer) => customer.id === authUser.customerId);
    if (byId) return byId;
  }

  if (authUser?.name) {
    const byName = customers.find((customer) => customer.name === authUser.name);
    if (byName) return byName;
  }

  return customers[0];
}

export function getCustomerSubtitle(
  customer: Customer,
  projects: Project[],
  options?: { includeLocation?: boolean }
): string {
  const includeLocation = options?.includeLocation ?? true;
  const project = projects.find(
    (p) => p.customerId === customer.id || p.customerName === customer.name
  );
  if (project) {
    return includeLocation ? `${project.title} · ${customer.location}` : project.title;
  }
  return includeLocation ? customer.location : "";
}

export function latestCustomerProject(
  customerId: string,
  projects: Project[]
): Project | undefined {
  const customerProjects = projects.filter((project) => project.customerId === customerId);
  if (customerProjects.length === 0) return undefined;

  return customerProjects.reduce((current, candidate) => {
    const currentTime = Date.parse(current.updatedAt ?? current.lastUpdated ?? "") || 0;
    const candidateTime = Date.parse(candidate.updatedAt ?? candidate.lastUpdated ?? "") || 0;
    return candidateTime > currentTime ? candidate : current;
  });
}

export function customerProjectsHref(customerId: string, projects: Project[]): string {
  const project = latestCustomerProject(customerId, projects);
  return project ? `/projects/${project.id}` : "/projects";
}
