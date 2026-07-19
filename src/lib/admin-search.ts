import type { Customer, Designer, Project } from "@/lib/mock-data";

export type AdminSearchResultType = "designer" | "customer" | "project";

export interface AdminSearchResult {
  id: string;
  type: AdminSearchResultType;
  title: string;
  subtitle: string;
  href: string;
}

const MAX_RESULTS = 8;

export function searchAdminDirectory(
  query: string,
  data: { designers: Designer[]; customers: Customer[]; projects: Project[] }
): AdminSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return [];

  const results: AdminSearchResult[] = [];

  for (const designer of data.designers) {
    const haystack =
      `${designer.businessName} ${designer.designerName} ${designer.location} ${designer.specialty}`.toLowerCase();
    if (!haystack.includes(normalized)) continue;
    results.push({
      id: designer.id,
      type: "designer",
      title: designer.businessName,
      subtitle: designer.designerName,
      href: `/dashboard/admin/designers/${designer.id}`,
    });
  }

  for (const customer of data.customers) {
    const haystack = `${customer.name} ${customer.email} ${customer.location}`.toLowerCase();
    if (!haystack.includes(normalized)) continue;
    results.push({
      id: customer.id,
      type: "customer",
      title: customer.name,
      subtitle: customer.email || customer.location || "Customer",
      href: `/dashboard/admin/customers/${customer.id}`,
    });
  }

  for (const project of data.projects) {
    const haystack =
      `${project.title} ${project.projectCode} ${project.customerName} ${project.outfitType}`.toLowerCase();
    if (!haystack.includes(normalized)) continue;
    results.push({
      id: project.id,
      type: "project",
      title: project.title,
      subtitle: `${project.projectCode} · ${project.customerName}`,
      href: `/projects/${project.id}`,
    });
  }

  return results.slice(0, MAX_RESULTS);
}
