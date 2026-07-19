import { createClient } from "@/lib/supabase/client";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import { isSupabaseEnabled } from "@/lib/config/backend";
import {
  formatTestimonialDisplayName,
  formatTestimonialLocation,
  type SubmitTestimonialInput,
  type Testimonial,
  type TestimonialReport,
  type TestimonialStatus,
} from "@/lib/testimonials";
import {
  readTestimonialReportsFromStorage,
  readTestimonialsFromStorage,
  writeTestimonialReportsToStorage,
  writeTestimonialsToStorage,
} from "@/lib/testimonial-store";
import { resolveCustomerProfileId } from "@/lib/services/customerService";
import { resolveDesignerProfileId } from "@/lib/services/designerService";

type TestimonialRow = {
  id: string;
  legacy_id: string | null;
  project_id: string;
  customer_id: string;
  designer_id: string;
  rating: number;
  body: string;
  outfit_type: string;
  photo_url: string | null;
  allow_public: boolean;
  show_name: boolean;
  show_location: boolean;
  display_name: string;
  display_location: string | null;
  private_feedback: string | null;
  status: TestimonialStatus;
  request_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapTestimonialRow(
  row: TestimonialRow,
  meta?: {
    projectTitle?: string;
    projectStatus?: string;
    customerName?: string;
    designerLegacyId?: string;
    designerName?: string;
  }
): Testimonial {
  return {
    id: row.legacy_id ?? row.id,
    projectId: row.project_id,
    customerId: row.customer_id,
    designerId: meta?.designerLegacyId ?? row.designer_id,
    rating: row.rating,
    body: row.body,
    outfitType: row.outfit_type,
    photoUrl: row.photo_url?.trim() || undefined,
    allowPublic: row.allow_public,
    showName: row.show_name,
    showLocation: row.show_location,
    displayName: row.display_name,
    displayLocation: row.display_location?.trim() || undefined,
    privateFeedback: row.private_feedback?.trim() || undefined,
    status: row.status,
    verified: meta?.projectStatus === "Completed",
    projectTitle: meta?.projectTitle,
    customerName: meta?.customerName,
    designerName: meta?.designerName,
    requestSentAt: row.request_sent_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type TestimonialReportRow = {
  id: string;
  legacy_id: string | null;
  testimonial_id: string;
  reporter_id: string;
  reason: string;
  detail: string;
  status: TestimonialReport["status"];
  created_at: string;
};

function mapTestimonialReportRow(
  row: TestimonialReportRow,
  testimonial?: Pick<Testimonial, "body" | "designerName">
): TestimonialReport {
  return {
    id: row.legacy_id ?? row.id,
    testimonialId: row.testimonial_id,
    reporterId: row.reporter_id,
    reason: row.reason,
    detail: row.detail,
    status: row.status,
    createdAt: row.created_at,
    testimonialBody: testimonial?.body,
    designerName: testimonial?.designerName,
  };
}

async function enrichTestimonials(rows: TestimonialRow[]): Promise<Testimonial[]> {
  if (!rows.length) return [];

  const supabase = createClient();
  const projectIds = [...new Set(rows.map((row) => row.project_id).filter(Boolean))];
  const designerIds = [...new Set(rows.map((row) => row.designer_id).filter(Boolean))];

  const [{ data: projects }, { data: designers }] = await Promise.all([
    projectIds.length
      ? supabase.from("projects").select("id, legacy_id, title, status, customer_name").in("id", projectIds)
      : Promise.resolve({ data: [] as Array<{ id: string; legacy_id: string | null; title: string; status: string; customer_name: string | null }> }),
    designerIds.length
      ? supabase.from("designer_profiles").select("id, legacy_id, business_name").in("id", designerIds)
      : Promise.resolve({ data: [] as Array<{ id: string; legacy_id: string | null; business_name: string | null }> }),
  ]);

  const projectById = new Map((projects ?? []).map((project) => [project.id, project]));
  const designerById = new Map((designers ?? []).map((designer) => [designer.id, designer]));

  return rows.map((row) => {
    const project = projectById.get(row.project_id);
    const designer = designerById.get(row.designer_id);
    return mapTestimonialRow(row, {
      projectTitle: project?.title,
      projectStatus: project?.status,
      customerName: project?.customer_name ?? undefined,
      designerLegacyId: designer?.legacy_id ?? designer?.id,
      designerName: designer?.business_name ?? undefined,
    });
  });
}

export async function listTestimonialsForScope(options: {
  role: "admin" | "designer" | "customer" | null;
  designerLegacyId?: string;
  customerLegacyId?: string;
}): Promise<Testimonial[]> {
  if (!isSupabaseEnabled()) {
    const all = readTestimonialsFromStorage();
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
  let query = supabase.from("testimonials_for_participants").select("*");

  if (options.role === "designer" && options.designerLegacyId) {
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
  return enrichTestimonials((data ?? []) as TestimonialRow[]);
}

export async function listPublicTestimonialsForDesigner(designerLegacyId: string): Promise<Testimonial[]> {
  if (!isSupabaseEnabled()) {
    return readTestimonialsFromStorage().filter(
      (item) => item.designerId === designerLegacyId && item.allowPublic && item.status === "active"
    );
  }

  const designerId = await resolveDesignerProfileId(designerLegacyId);
  if (!designerId) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("marketplace_testimonials")
    .select(
      "id, legacy_id, designer_id, rating, body, outfit_type, photo_url, allow_public, show_name, show_location, display_name, display_location, status, created_at, updated_at"
    )
    .eq("designer_id", designerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as Array<Partial<TestimonialRow>>).map((row) => ({
    id: String(row.id),
    legacy_id: row.legacy_id ?? null,
    project_id: "",
    customer_id: "",
    designer_id: String(row.designer_id),
    rating: Number(row.rating ?? 0),
    body: String(row.body ?? ""),
    outfit_type: String(row.outfit_type ?? ""),
    photo_url: row.photo_url ?? null,
    allow_public: Boolean(row.allow_public),
    show_name: Boolean(row.show_name),
    show_location: Boolean(row.show_location),
    display_name: String(row.display_name ?? ""),
    display_location: row.display_location ?? null,
    private_feedback: null,
    status: (row.status ?? "active") as TestimonialStatus,
    request_sent_at: null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  }));
  const enriched = await enrichTestimonials(rows);
  return enriched.filter((item) => item.allowPublic && item.status === "active");
}

export async function submitTestimonial(
  input: SubmitTestimonialInput,
  customerLegacyId: string,
  designerLegacyId: string
): Promise<Testimonial> {
  const displayName = formatTestimonialDisplayName(input.customerFirstName, input.showName);
  const displayLocation =
    formatTestimonialLocation(input.customerLocation, input.showLocation) ?? "";

  if (!isSupabaseEnabled()) {
    const items = readTestimonialsFromStorage();
    if (items.some((item) => item.projectId === input.projectId)) {
      throw new Error("You already left a testimonial for this project.");
    }
    const created: Testimonial = {
      id: `t-${Date.now()}`,
      projectId: input.projectId,
      customerId: customerLegacyId,
      designerId: designerLegacyId,
      rating: input.rating,
      body: input.body.trim(),
      outfitType: input.outfitType,
      photoUrl: input.photoUrl,
      allowPublic: input.allowPublic,
      showName: input.showName,
      showLocation: input.showLocation,
      displayName,
      displayLocation,
      privateFeedback: input.privateFeedback?.trim() || undefined,
      status: "active",
      verified: true,
      createdAt: new Date().toISOString(),
    };
    writeTestimonialsToStorage([created, ...items]);
    return created;
  }

  const supabase = createClient();
  const customerId = await resolveCustomerProfileId(customerLegacyId);
  if (!customerId) throw new Error("Customer profile not found.");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, status, designer_id, customer_id, customer_name")
    .or(legacyOrIdFilter(input.projectId))
    .maybeSingle();
  if (projectError) throw new Error(projectError.message);
  if (!project) throw new Error("Project not found.");
  if (project.status !== "Completed") {
    throw new Error("Testimonials are only available after you confirm your project is complete.");
  }

  const { data: customerProfile } = await supabase
    .from("customer_profiles")
    .select("id, name")
    .eq("id", customerId)
    .maybeSingle();

  const ownsProject =
    project.customer_id === customerId ||
    project.customer_name === customerProfile?.name;
  if (!ownsProject) throw new Error("You can only review your own completed project.");

  const { data, error } = await supabase
    .from("testimonials")
    .insert({
      project_id: project.id,
      customer_id: customerId,
      designer_id: project.designer_id,
      rating: input.rating,
      body: input.body.trim(),
      outfit_type: input.outfitType,
      photo_url: input.photoUrl ?? "",
      allow_public: input.allowPublic,
      show_name: input.showName,
      show_location: input.showLocation,
      display_name: displayName,
      display_location: displayLocation,
      private_feedback: input.privateFeedback?.trim() ?? "",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("You already left a testimonial for this project.");
    }
    throw new Error(error.message);
  }

  const [created] = await enrichTestimonials([data as TestimonialRow]);
  return created;
}

export async function requestProjectTestimonial(projectLegacyId: string, designerLegacyId: string) {
  if (!isSupabaseEnabled()) {
    return;
  }

  const supabase = createClient();
  const designerId = await resolveDesignerProfileId(designerLegacyId);
  if (!designerId) throw new Error("Designer profile not found.");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, status, designer_id")
    .or(legacyOrIdFilter(projectLegacyId))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) throw new Error("Project not found.");
  if (project.designer_id !== designerId) throw new Error("You can only request testimonials for your projects.");
  if (project.status !== "Completed" && project.status !== "Awaiting Customer Confirmation" && project.status !== "Delivered") {
    throw new Error("Request testimonials after the client confirms the project is complete.");
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update({ testimonial_requested_at: new Date().toISOString() })
    .eq("id", project.id);
  if (updateError) throw new Error(updateError.message);
}

export async function setTestimonialHidden(testimonialId: string, hidden: boolean) {
  if (!isSupabaseEnabled()) {
    const items = readTestimonialsFromStorage().map((item) =>
      item.id === testimonialId
        ? { ...item, status: hidden ? ("hidden_by_designer" as const) : ("active" as const) }
        : item
    );
    writeTestimonialsToStorage(items);
    return;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("testimonials")
    .update({ status: hidden ? "hidden_by_designer" : "active" })
    .or(legacyOrIdFilter(testimonialId));
  if (error) throw new Error(error.message);
}

export async function reportTestimonial(
  testimonialId: string,
  reporterUserId: string,
  reason: string,
  detail: string
) {
  if (!isSupabaseEnabled()) {
    const reports = readTestimonialReportsFromStorage();
    reports.unshift({
      id: `tr-${Date.now()}`,
      testimonialId,
      reporterId: reporterUserId,
      reason,
      detail,
      status: "open",
      createdAt: new Date().toISOString(),
    });
    writeTestimonialReportsToStorage(reports);
    return;
  }

  const supabase = createClient();
  const { data: testimonial, error: lookupError } = await supabase
    .from("testimonials")
    .select("id")
    .or(legacyOrIdFilter(testimonialId))
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!testimonial) throw new Error("Testimonial not found.");

  const { error } = await supabase.from("testimonial_reports").insert({
    testimonial_id: testimonial.id,
    reporter_id: reporterUserId,
    reason,
    detail,
  });
  if (error) throw new Error(error.message);
}

export async function listTestimonialReports(): Promise<TestimonialReport[]> {
  if (!isSupabaseEnabled()) {
    return readTestimonialReportsFromStorage();
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("testimonial_reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const reportRows = (data ?? []) as TestimonialReportRow[];
  if (!reportRows.length) return [];

  const testimonialIds = [...new Set(reportRows.map((row) => row.testimonial_id))];
  const { data: testimonialRows, error: testimonialError } = await supabase
    .from("testimonials")
    .select("*")
    .in("id", testimonialIds);
  if (testimonialError) throw new Error(testimonialError.message);

  const enriched = await enrichTestimonials((testimonialRows ?? []) as TestimonialRow[]);
  const testimonialByUuid = new Map(
    (testimonialRows ?? []).map((row, index) => [row.id, enriched[index]])
  );

  return reportRows.map((row) =>
    mapTestimonialReportRow(row, testimonialByUuid.get(row.testimonial_id))
  );
}

export async function adminRemoveTestimonial(testimonialId: string) {
  if (!isSupabaseEnabled()) {
    const items = readTestimonialsFromStorage().map((item) =>
      item.id === testimonialId
        ? { ...item, status: "removed_by_admin" as const, allowPublic: false }
        : item
    );
    writeTestimonialsToStorage(items);
    return;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("testimonials")
    .update({ status: "removed_by_admin", allow_public: false })
    .or(legacyOrIdFilter(testimonialId));
  if (error) throw new Error(error.message);
}

export async function adminResolveTestimonialReport(reportId: string, status: "dismissed" | "resolved") {
  if (!isSupabaseEnabled()) {
    const reports = readTestimonialReportsFromStorage().map((item) =>
      item.id === reportId ? { ...item, status } : item
    );
    writeTestimonialReportsToStorage(reports);
    return;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("testimonial_reports")
    .update({ status })
    .or(legacyOrIdFilter(reportId));
  if (error) throw new Error(error.message);
}
