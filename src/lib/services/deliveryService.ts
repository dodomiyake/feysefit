import { createClient } from "@/lib/supabase/client";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import { isSupabaseEnabled } from "@/lib/config/backend";
import type { ProjectStatus } from "@/lib/design-tokens";
import type { Project } from "@/lib/mock-data";
import {
  DESIGNER_DELIVER_ACTION_STATUS,
  REDELIVERED_STATUS,
  canReportDeliveryIssue,
  getIssueStatusForDeliveryReport,
  isAwaitingDeliveryConfirmation,
  type DeliveryIssueType,
  type ProjectDeliveryIssue,
} from "@/lib/project-delivery";
import {
  readDeliveryIssuesFromStorage,
  writeDeliveryIssuesToStorage,
} from "@/lib/delivery-issue-store";
import { formatLastUpdated, formatDesignerDeliveryResponseCustomerUpdate, formatDeliveredCustomerUpdate, formatDeliveryConfirmedCustomerUpdate, formatDeliveryConfirmedDesignerUpdate, formatIssueReportedAfterRedeliveryCustomerUpdate, formatIssueReportedAfterRedeliveryDesignerUpdate, formatIssueReportedCustomerUpdate, formatIssueReportedDesignerUpdate, formatRedeliveredCustomerUpdate } from "@/lib/project-updates";
import { resolveCustomerProfileId } from "@/lib/services/customerService";
import { getProjectById, listProjects } from "@/lib/services/projectService";
import { updateProjectStatusInStore } from "@/lib/project-storage";

type DeliveryIssueRow = {
  id: string;
  legacy_id: string | null;
  project_id: string;
  customer_id: string;
  designer_id: string;
  issue_type: DeliveryIssueType;
  detail: string;
  status: ProjectDeliveryIssue["status"];
  designer_response: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapDeliveryIssueRow(
  row: DeliveryIssueRow,
  meta?: { projectTitle?: string; customerName?: string; projectLegacyId?: string }
): ProjectDeliveryIssue {
  return {
    id: row.legacy_id ?? row.id,
    projectId: meta?.projectLegacyId ?? row.project_id,
    projectUuid: row.project_id,
    customerId: row.customer_id,
    designerId: row.designer_id,
    issueType: row.issue_type,
    detail: row.detail,
    status: row.status,
    designerResponse: row.designer_response?.trim() || undefined,
    resolvedAt: row.resolved_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    projectTitle: meta?.projectTitle,
    customerName: meta?.customerName,
  };
}

function deliverCustomerUpdate(): string {
  return formatDeliveredCustomerUpdate();
}

function redeliverCustomerUpdate(): string {
  return formatRedeliveredCustomerUpdate();
}

function completedCustomerUpdate(afterRedelivery = false): string {
  return afterRedelivery
    ? "Thank you for confirming after redelivery — your project is now complete."
    : formatDeliveryConfirmedCustomerUpdate();
}

function issueCustomerUpdate(issueLabel: string, afterRedelivery = false): string {
  return afterRedelivery
    ? formatIssueReportedAfterRedeliveryCustomerUpdate(issueLabel)
    : formatIssueReportedCustomerUpdate(issueLabel);
}

function issueDesignerUpdate(
  customerName: string,
  issueLabel: string,
  detail: string,
  afterRedelivery = false
): string {
  return afterRedelivery
    ? formatIssueReportedAfterRedeliveryDesignerUpdate(customerName, issueLabel, detail)
    : formatIssueReportedDesignerUpdate(customerName, issueLabel, detail);
}

export async function listDeliveryIssuesForScope(options: {
  role: "admin" | "designer" | "customer" | null;
  designerLegacyId?: string;
  customerLegacyId?: string;
}): Promise<ProjectDeliveryIssue[]> {
  if (!isSupabaseEnabled()) {
    const all = readDeliveryIssuesFromStorage();
    if (options.role === "admin") return all;
    if (options.role === "designer" && options.designerLegacyId) {
      return all.filter((item) => item.designerId === options.designerLegacyId);
    }
    if (options.role === "customer" && options.customerLegacyId) {
      return all.filter((item) => item.customerId === options.customerLegacyId);
    }
    return all;
  }

  const supabase = createClient();
  let query = supabase.from("project_delivery_issues").select("*");

  if (options.role === "designer" && options.designerLegacyId) {
    const { resolveDesignerProfileId } = await import("@/lib/services/designerService");
    const designerId = await resolveDesignerProfileId(options.designerLegacyId);
    if (!designerId) return [];
    query = query.eq("designer_id", designerId);
  } else if (options.role === "customer" && options.customerLegacyId) {
    const customerId = await resolveCustomerProfileId(options.customerLegacyId);
    if (!customerId) return [];
    query = query.eq("customer_id", customerId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = data as DeliveryIssueRow[];
  if (rows.length === 0) return [];

  const projectUuids = [...new Set(rows.map((row) => row.project_id))];
  const { data: projectRows } = await supabase
    .from("projects")
    .select("id, legacy_id")
    .in("id", projectUuids);
  const projectIdByUuid = new Map(
    (projectRows ?? []).map((project) => [project.id, project.legacy_id ?? project.id])
  );

  return rows.map((row) =>
    mapDeliveryIssueRow(row, {
      projectLegacyId: projectIdByUuid.get(row.project_id),
    })
  );
}

export async function markProjectDelivered(projectId: string): Promise<Project> {
  if (!isSupabaseEnabled()) {
    const updated = updateProjectStatusInStore(projectId, DESIGNER_DELIVER_ACTION_STATUS);
    const project = updated.find((item) => item.id === projectId);
    if (!project) throw new Error("Project not found");
    return {
      ...project,
      customerUpdate: deliverCustomerUpdate(),
      designerUpdate: undefined,
    };
  }

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .or(legacyOrIdFilter(projectId))
    .maybeSingle();
  if (!existing) throw new Error("Project not found");

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("projects")
    .update({
      status: DESIGNER_DELIVER_ACTION_STATUS,
      customer_update: deliverCustomerUpdate(),
      designer_update: "",
      last_updated: formatLastUpdated(),
      updated_at: now,
      delivered_at: now,
    })
    .eq("id", existing.id);
  if (error) throw new Error(error.message);

  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found");
  return project;
}

export async function redeliverProject(projectId: string): Promise<Project> {
  if (!isSupabaseEnabled()) {
    const updated = updateProjectStatusInStore(projectId, REDELIVERED_STATUS);
    const project = updated.find((item) => item.id === projectId);
    if (!project) throw new Error("Project not found");
    return {
      ...project,
      customerUpdate: redeliverCustomerUpdate(),
      designerUpdate: undefined,
    };
  }

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .or(legacyOrIdFilter(projectId))
    .maybeSingle();
  if (!existing) throw new Error("Project not found");

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("projects")
    .update({
      status: REDELIVERED_STATUS,
      customer_update: redeliverCustomerUpdate(),
      designer_update: "",
      last_updated: formatLastUpdated(),
      updated_at: now,
      delivered_at: now,
    })
    .eq("id", existing.id);
  if (error) throw new Error(error.message);

  await supabase
    .from("project_delivery_issues")
    .update({
      status: "resolved",
      resolved_at: now,
    })
    .eq("project_id", existing.id)
    .neq("status", "resolved");

  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found");
  return project;
}

export async function confirmProjectDelivery(
  projectId: string,
  customerLegacyId: string
): Promise<Project> {
  if (!isSupabaseEnabled()) {
    const before = (await listProjects()).find((item) => item.id === projectId);
    if (!before) throw new Error("Project not found");
    const afterRedelivery = before.status === REDELIVERED_STATUS;
    const updated = updateProjectStatusInStore(projectId, "Completed");
    const project = updated.find((item) => item.id === projectId);
    if (!project) throw new Error("Project not found");
    return {
      ...project,
      customerUpdate: completedCustomerUpdate(afterRedelivery),
      designerUpdate: formatDeliveryConfirmedDesignerUpdate(project.customerName),
    };
  }

  const supabase = createClient();
  const customerId = await resolveCustomerProfileId(customerLegacyId);
  if (!customerId) throw new Error("Client profile not found.");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, status, customer_id, customer_name")
    .or(legacyOrIdFilter(projectId))
    .maybeSingle();
  if (projectError) throw new Error(projectError.message);
  if (!project) throw new Error("Project not found.");

  const ownsProject =
    project.customer_id === customerId ||
    (await supabase
      .from("customer_profiles")
      .select("name")
      .eq("id", customerId)
      .maybeSingle()
      .then((r) => r.data?.name === project.customer_name));
  if (!ownsProject) throw new Error("You can only confirm your own project.");

  if (!isAwaitingDeliveryConfirmation(project.status) && project.status !== "Delivered") {
    throw new Error("This project is not awaiting your confirmation.");
  }

  const { data: confirmedId, error } = await supabase.rpc("confirm_customer_project_delivery", {
    project_key: projectId,
  });
  if (error) throw new Error(error.message);
  if (!confirmedId) throw new Error("Could not confirm delivery — project was not updated.");

  const refreshed = await getProjectById(projectId);
  if (!refreshed) throw new Error("Project not found");
  if (refreshed.status !== "Completed") {
    throw new Error(
      "Delivery confirmation could not be saved. Run supabase/patch-customer-delivery-confirm.sql in your database."
    );
  }
  return refreshed;
}

export async function reportProjectDeliveryIssue(input: {
  projectId: string;
  customerLegacyId: string;
  issueType: DeliveryIssueType;
  detail: string;
}): Promise<{ project: Project; issue: ProjectDeliveryIssue }> {
  const { getDeliveryIssueLabel } = await import("@/lib/project-delivery");
  const issueLabel = getDeliveryIssueLabel(input.issueType);

  if (!isSupabaseEnabled()) {
    const issues = readDeliveryIssuesFromStorage();
    const projects = await listProjects();
    const project = projects.find((item) => item.id === input.projectId);
    if (!project) throw new Error("Project not found");
    if (!canReportDeliveryIssue(project.status)) {
      throw new Error("This project is not awaiting your confirmation.");
    }

    const afterRedelivery = project.status === REDELIVERED_STATUS;
    const nextStatus = getIssueStatusForDeliveryReport(project.status, input.issueType);

    const issue: ProjectDeliveryIssue = {
      id: `di-${Date.now()}`,
      projectId: input.projectId,
      customerId: input.customerLegacyId,
      designerId: project.designerId ?? "",
      issueType: input.issueType,
      detail: input.detail.trim(),
      status: "open",
      createdAt: new Date().toISOString(),
      projectTitle: project.title,
    };
    writeDeliveryIssuesToStorage([issue, ...issues]);

    const updated = updateProjectStatusInStore(input.projectId, nextStatus);
    const nextProject = updated.find((item) => item.id === input.projectId)!;
    return {
      project: {
        ...nextProject,
        customerUpdate: issueCustomerUpdate(issueLabel, afterRedelivery),
        designerUpdate: issueDesignerUpdate(
          nextProject.customerName,
          issueLabel,
          input.detail,
          afterRedelivery
        ),
      },
      issue,
    };
  }

  const supabase = createClient();
  const customerId = await resolveCustomerProfileId(input.customerLegacyId);
  if (!customerId) throw new Error("Client profile not found.");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, legacy_id, status, customer_id, customer_name, designer_id, title")
    .or(legacyOrIdFilter(input.projectId))
    .maybeSingle();
  if (projectError) throw new Error(projectError.message);
  if (!project) throw new Error("Project not found.");

  if (!canReportDeliveryIssue(project.status)) {
    throw new Error("This project is not awaiting your confirmation.");
  }

  const expectedStatus = getIssueStatusForDeliveryReport(project.status, input.issueType);

  const { data: issueRowId, error: reportError } = await supabase.rpc(
    "report_customer_delivery_issue",
    {
      project_key: input.projectId,
      issue_type: input.issueType,
      detail: input.detail.trim(),
    }
  );
  if (reportError) throw new Error(reportError.message);
  if (!issueRowId) throw new Error("Could not report issue — project was not updated.");

  const { data: issueRow, error: issueLookupError } = await supabase
    .from("project_delivery_issues")
    .select("*")
    .eq("id", issueRowId)
    .maybeSingle();
  if (issueLookupError) throw new Error(issueLookupError.message);
  if (!issueRow) throw new Error("Issue not found after reporting.");

  const refreshed = await getProjectById(input.projectId);
  if (!refreshed) throw new Error("Project not found");
  if (refreshed.status !== expectedStatus) {
    throw new Error(
      "Issue report could not be saved. Run supabase/patch-customer-delivery-confirm.sql in your database."
    );
  }

  return {
    project: refreshed,
    issue: mapDeliveryIssueRow(issueRow as DeliveryIssueRow, {
      projectTitle: project.title,
      projectLegacyId: project.legacy_id ?? project.id,
    }),
  };
}

export async function respondToDeliveryIssue(input: {
  issueId: string;
  designerLegacyId: string;
  response: string;
  projectStatus?: ProjectStatus;
  markResolved?: boolean;
}): Promise<{ issue: ProjectDeliveryIssue; project?: Project }> {
  const trimmedResponse = input.response.trim();
  if (!trimmedResponse) throw new Error("Add a response for your client.");

  if (!isSupabaseEnabled()) {
    const issues = readDeliveryIssuesFromStorage().map((item) =>
      item.id === input.issueId
        ? {
            ...item,
            designerResponse: trimmedResponse,
            status: input.markResolved ? ("resolved" as const) : ("in_progress" as const),
            updatedAt: new Date().toISOString(),
          }
        : item
    );
    writeDeliveryIssuesToStorage(issues);
    const issue = issues.find((item) => item.id === input.issueId);
    if (!issue) throw new Error("Issue not found");

    let project: Project | undefined;
    if (input.projectStatus) {
      const updated = updateProjectStatusInStore(issue.projectId, input.projectStatus);
      project = updated.find((item) => item.id === issue.projectId);
      if (project) {
        project = {
          ...project,
          customerUpdate: formatDesignerDeliveryResponseCustomerUpdate(trimmedResponse),
          designerUpdate: undefined,
        };
      }
    }
    return { issue, project };
  }

  const { resolveDesignerProfileId } = await import("@/lib/services/designerService");
  const designerId = await resolveDesignerProfileId(input.designerLegacyId);
  if (!designerId) throw new Error("Designer profile not found.");

  const supabase = createClient();
  const { data: issue, error: lookupError } = await supabase
    .from("project_delivery_issues")
    .select("*")
    .or(legacyOrIdFilter(input.issueId))
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!issue || issue.designer_id !== designerId) throw new Error("Issue not found.");

  const { data: updatedIssue, error } = await supabase
    .from("project_delivery_issues")
    .update({
      designer_response: trimmedResponse,
      status: input.markResolved ? "resolved" : "in_progress",
      resolved_at: input.markResolved ? new Date().toISOString() : null,
    })
    .eq("id", issue.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const { data: projectRow } = await supabase
    .from("projects")
    .select("id, legacy_id")
    .eq("id", issue.project_id)
    .maybeSingle();

  let project: Project | undefined;
  if (input.projectStatus) {
    const customerUpdate = formatDesignerDeliveryResponseCustomerUpdate(trimmedResponse);
    const { error: projectError } = await supabase
      .from("projects")
      .update({
        status: input.projectStatus,
        customer_update: customerUpdate,
        designer_update: "",
        last_updated: formatLastUpdated(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", issue.project_id);
    if (projectError) throw new Error(projectError.message);

    const projectLegacyId = projectRow?.legacy_id ?? issue.project_id;
    project = (await getProjectById(projectLegacyId)) ?? undefined;
  }

  return {
    issue: mapDeliveryIssueRow(updatedIssue as DeliveryIssueRow, {
      projectLegacyId: projectRow?.legacy_id ?? issue.project_id,
    }),
    project,
  };
}
