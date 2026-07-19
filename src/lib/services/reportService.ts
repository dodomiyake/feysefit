import { createClient } from "@/lib/supabase/client";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import { profileId } from "@/lib/supabase/mappers";
import type { UserReport } from "@/lib/admin-reports";

type ReportRow = {
  id: string;
  legacy_id: string | null;
  reported_user_id: string | null;
  handle: string;
  reported_name: string | null;
  priority: string;
  reason: string;
  detail: string;
  status: UserReport["status"];
  created_at: string;
};

async function resolveReportRow(reportKey: string): Promise<ReportRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, legacy_id, reported_user_id, handle, reported_name, priority, reason, detail, status, created_at")
    .or(legacyOrIdFilter(reportKey))
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function resolveAdminProfileHref(reportedUserId: string | null): Promise<string | null> {
  if (!reportedUserId) return null;

  const supabase = createClient();
  const [{ data: designer }, { data: customer }] = await Promise.all([
    supabase
      .from("designer_profiles")
      .select("id, legacy_id")
      .eq("user_id", reportedUserId)
      .maybeSingle(),
    supabase
      .from("customer_profiles")
      .select("id, legacy_id")
      .eq("user_id", reportedUserId)
      .maybeSingle(),
  ]);

  if (designer) {
    return `/dashboard/admin/designers/${profileId(designer)}`;
  }
  if (customer) {
    return `/dashboard/admin/customers/${profileId(customer)}`;
  }
  return null;
}

async function batchResolveAdminProfileHrefs(
  userIds: string[]
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const hrefs = new Map<string, string>();
  if (!uniqueIds.length) return hrefs;

  const supabase = createClient();
  const [{ data: designers }, { data: customers }] = await Promise.all([
    supabase.from("designer_profiles").select("id, legacy_id, user_id").in("user_id", uniqueIds),
    supabase.from("customer_profiles").select("id, legacy_id, user_id").in("user_id", uniqueIds),
  ]);

  for (const designer of designers ?? []) {
    if (designer.user_id) {
      hrefs.set(designer.user_id, `/dashboard/admin/designers/${profileId(designer)}`);
    }
  }
  for (const customer of customers ?? []) {
    if (customer.user_id && !hrefs.has(customer.user_id)) {
      hrefs.set(customer.user_id, `/dashboard/admin/customers/${profileId(customer)}`);
    }
  }

  return hrefs;
}

function mapReportRow(row: ReportRow, profileHrefs: Map<string, string>): UserReport {
  return {
    id: row.legacy_id ?? row.id,
    handle: row.handle,
    name: row.reported_name,
    reportedUserId: row.reported_user_id,
    adminProfileHref: row.reported_user_id
      ? profileHrefs.get(row.reported_user_id) ?? null
      : null,
    priority: row.priority,
    reason: row.reason,
    detail: row.detail,
    variant: row.priority.toLowerCase().includes("high") ? "default" : "outline",
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listReports(): Promise<UserReport[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, legacy_id, reported_user_id, handle, reported_name, priority, reason, detail, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ReportRow[];
  const profileHrefs = await batchResolveAdminProfileHrefs(
    rows.map((row) => row.reported_user_id ?? "")
  );
  return rows.map((row) => mapReportRow(row, profileHrefs));
}

export async function dismissReport(reportKey: string) {
  const report = await resolveReportRow(reportKey);
  if (!report) throw new Error("Report not found");

  const supabase = createClient();
  const { error } = await supabase
    .from("reports")
    .update({ status: "dismissed" })
    .eq("id", report.id);
  if (error) throw new Error(error.message);
}

async function setReportedUserAccountStatus(
  reportKey: string,
  accountStatus: "suspended" | "banned"
) {
  const report = await resolveReportRow(reportKey);
  if (!report) throw new Error("Report not found");
  if (!report.reported_user_id) {
    throw new Error("This report is not linked to a user account.");
  }

  const supabase = createClient();
  const { error: userError } = await supabase
    .from("users")
    .update({ account_status: accountStatus, updated_at: new Date().toISOString() })
    .eq("id", report.reported_user_id);
  if (userError) throw new Error(userError.message);

  const { data: designer } = await supabase
    .from("designer_profiles")
    .select("id")
    .eq("user_id", report.reported_user_id)
    .maybeSingle();

  if (designer) {
    const { error: designerError } = await supabase
      .from("designer_profiles")
      .update({ marketplace_live: false, updated_at: new Date().toISOString() })
      .eq("id", designer.id);
    if (designerError) throw new Error(designerError.message);
  }

  const { error: reportError } = await supabase
    .from("reports")
    .update({ status: "resolved" })
    .eq("id", report.id);
  if (reportError) throw new Error(reportError.message);
}

export async function suspendReportedUser(reportKey: string) {
  await setReportedUserAccountStatus(reportKey, "suspended");
}

export async function banReportedUser(reportKey: string) {
  await setReportedUserAccountStatus(reportKey, "banned");
}

export async function resolveAdminProfileHrefForUser(userId: string) {
  return resolveAdminProfileHref(userId);
}
