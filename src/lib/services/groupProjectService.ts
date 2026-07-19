import { createClient } from "@/lib/supabase/client";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import type { PreferredFit } from "@/lib/measurement-sections";
import type {
  GroupEventType,
  GroupOutfitStatus,
  GroupProject,
  GroupProjectMember,
  MeasurementRecordedBy,
} from "@/lib/local-customer";
import { resolveDesignerProfileId } from "@/lib/services/designerService";
import { resolveCustomerProfileId } from "@/lib/services/customerService";
import type { DbGroupProject, DbGroupProjectMember } from "@/lib/types/database";

const STORAGE_KEY = "feysefit_group_projects";

function mapGroup(row: DbGroupProject, memberCount = 0): GroupProject {
  return {
    id: row.legacy_id ?? row.id,
    title: row.title,
    eventType: row.event_type as GroupEventType,
    eventDate: row.event_date,
    notes: row.notes,
    memberCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMember(row: DbGroupProjectMember): GroupProjectMember {
  const values =
    row.measurement_values && typeof row.measurement_values === "object"
      ? (row.measurement_values as Record<string, string>)
      : {};

  return {
    id: row.legacy_id ?? row.id,
    groupProjectId: row.group_project_id,
    studioClientId: row.studio_client_id ?? undefined,
    customerId: row.customer_id ?? undefined,
    memberName: row.member_name,
    outfitStatus: row.outfit_status as GroupOutfitStatus,
    unit: row.unit === "cm" ? "cm" : "inches",
    preferredFit: row.preferred_fit as PreferredFit,
    measurementValues: values,
    measurementRecordedBy: row.measurement_recorded_by as MeasurementRecordedBy,
    totalPrice: row.total_price != null ? Number(row.total_price) : undefined,
    depositPaid: row.deposit_paid != null ? Number(row.deposit_paid) : undefined,
    paymentMethod: row.payment_method,
    paymentNotes: row.payment_notes,
    notes: row.notes,
  };
}

type LocalGroupStore = Record<string, { groups: GroupProject[]; members: GroupProjectMember[] }>;

function readLocal(designerLegacyId: string): LocalGroupStore[string] {
  if (typeof window === "undefined") return { groups: [], members: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { groups: [], members: [] };
    const parsed = JSON.parse(raw) as LocalGroupStore;
    return parsed[designerLegacyId] ?? { groups: [], members: [] };
  } catch {
    return { groups: [], members: [] };
  }
}

function writeLocal(designerLegacyId: string, store: LocalGroupStore[string]) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as LocalGroupStore) : {};
    parsed[designerLegacyId] = store;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

async function resolveDesignerId(designerLegacyId: string) {
  const profileId = await resolveDesignerProfileId(designerLegacyId);
  if (!profileId) throw new Error("Designer profile not found");
  return profileId;
}

export async function listGroupProjects(designerLegacyId: string): Promise<GroupProject[]> {
  if (!designerLegacyId) return [];
  if (!isSupabaseEnabled()) {
    const store = readLocal(designerLegacyId);
    return store.groups.map((group) => ({
      ...group,
      memberCount: store.members.filter((member) => member.groupProjectId === group.id).length,
    }));
  }

  const designerId = await resolveDesignerProfileId(designerLegacyId);
  if (!designerId) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("group_projects")
    .select("*")
    .eq("designer_id", designerId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  const groupIds = (data ?? []).map((row) => row.id);
  const memberCounts = new Map<string, number>();
  if (groupIds.length) {
    const { data: members } = await supabase
      .from("group_project_members")
      .select("group_project_id")
      .in("group_project_id", groupIds);
    for (const member of members ?? []) {
      memberCounts.set(
        member.group_project_id,
        (memberCounts.get(member.group_project_id) ?? 0) + 1
      );
    }
  }

  return (data ?? []).map((row) =>
    mapGroup(row as DbGroupProject, memberCounts.get(row.id) ?? 0)
  );
}

export async function getGroupProjectWithMembers(
  designerLegacyId: string,
  groupId: string
): Promise<{ group: GroupProject; members: GroupProjectMember[] } | null> {
  if (!isSupabaseEnabled()) {
    const store = readLocal(designerLegacyId);
    const group = store.groups.find((item) => item.id === groupId);
    if (!group) return null;
    return {
      group: {
        ...group,
        memberCount: store.members.filter((member) => member.groupProjectId === groupId).length,
      },
      members: store.members.filter((member) => member.groupProjectId === groupId),
    };
  }

  const supabase = createClient();
  const { data: groupRow, error } = await supabase
    .from("group_projects")
    .select("*")
    .or(legacyOrIdFilter(groupId))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!groupRow) return null;

  const { data: members, error: membersError } = await supabase
    .from("group_project_members")
    .select("*")
    .eq("group_project_id", groupRow.id);
  if (membersError) throw new Error(membersError.message);

  return {
    group: mapGroup(groupRow as DbGroupProject, members?.length ?? 0),
    members: (members ?? []).map((row) => mapMember(row as DbGroupProjectMember)),
  };
}

export async function createGroupProject(
  designerLegacyId: string,
  input: { title: string; eventType: GroupEventType; eventDate?: string; notes?: string }
): Promise<GroupProject> {
  const title = input.title.trim();
  if (!title) throw new Error("Group title is required");
  const legacyId = `grp-${Date.now().toString(36)}`;

  if (!isSupabaseEnabled()) {
    const group: GroupProject = {
      id: legacyId,
      title,
      eventType: input.eventType,
      eventDate: input.eventDate?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
      memberCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const store = readLocal(designerLegacyId);
    store.groups = [group, ...store.groups];
    writeLocal(designerLegacyId, store);
    return group;
  }

  const designerId = await resolveDesignerId(designerLegacyId);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("group_projects")
    .insert({
      legacy_id: legacyId,
      designer_id: designerId,
      title,
      event_type: input.eventType,
      event_date: input.eventDate?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapGroup(data as DbGroupProject, 0);
}

export async function addGroupProjectMember(
  designerLegacyId: string,
  groupId: string,
  input: {
    memberName: string;
    studioClientId?: string;
    customerId?: string;
    outfitStatus?: GroupOutfitStatus;
    notes?: string;
  }
): Promise<GroupProjectMember> {
  const memberName = input.memberName.trim();
  if (!memberName) throw new Error("Member name is required");
  const legacyId = `grm-${Date.now().toString(36)}`;

  if (!isSupabaseEnabled()) {
    const member: GroupProjectMember = {
      id: legacyId,
      groupProjectId: groupId,
      studioClientId: input.studioClientId,
      customerId: input.customerId,
      memberName,
      outfitStatus: input.outfitStatus ?? "pending",
      unit: "inches",
      preferredFit: "regular",
      measurementValues: {},
      measurementRecordedBy: "designer",
      paymentMethod: "",
      paymentNotes: "",
      notes: input.notes?.trim() ?? "",
    };
    const store = readLocal(designerLegacyId);
    store.members = [member, ...store.members];
    writeLocal(designerLegacyId, store);
    return member;
  }

  const supabase = createClient();
  const { data: groupRow } = await supabase
    .from("group_projects")
    .select("id")
    .or(legacyOrIdFilter(groupId))
    .maybeSingle();
  if (!groupRow) throw new Error("Group project not found");

  let studioClientUuid: string | null = null;
  let customerUuid: string | null = null;
  if (input.studioClientId) {
    const { data } = await supabase
      .from("studio_clients")
      .select("id")
      .or(legacyOrIdFilter(input.studioClientId))
      .maybeSingle();
    studioClientUuid = data?.id ?? null;
  }
  if (input.customerId) {
    customerUuid = await resolveCustomerProfileId(input.customerId);
  }

  const { data, error } = await supabase
    .from("group_project_members")
    .insert({
      legacy_id: legacyId,
      group_project_id: groupRow.id,
      studio_client_id: studioClientUuid,
      customer_id: customerUuid,
      member_name: memberName,
      outfit_status: input.outfitStatus ?? "pending",
      notes: input.notes?.trim() ?? "",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapMember(data as DbGroupProjectMember);
}

export async function updateGroupProjectMember(
  designerLegacyId: string,
  memberId: string,
  patch: Partial<
    Pick<
      GroupProjectMember,
      | "outfitStatus"
      | "measurementValues"
      | "measurementRecordedBy"
      | "unit"
      | "preferredFit"
      | "totalPrice"
      | "depositPaid"
      | "paymentMethod"
      | "paymentNotes"
      | "notes"
    >
  >
): Promise<GroupProjectMember> {
  if (!isSupabaseEnabled()) {
    const store = readLocal(designerLegacyId);
    const index = store.members.findIndex((member) => member.id === memberId);
    if (index < 0) throw new Error("Group member not found");
    store.members[index] = { ...store.members[index], ...patch };
    writeLocal(designerLegacyId, store);
    return store.members[index];
  }

  const supabase = createClient();
  const { data: existing, error: lookupError } = await supabase
    .from("group_project_members")
    .select("id")
    .or(legacyOrIdFilter(memberId))
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!existing) throw new Error("Group member not found");

  const { data, error } = await supabase
    .from("group_project_members")
    .update({
      ...(patch.outfitStatus !== undefined ? { outfit_status: patch.outfitStatus } : {}),
      ...(patch.measurementValues !== undefined ? { measurement_values: patch.measurementValues } : {}),
      ...(patch.measurementRecordedBy !== undefined
        ? { measurement_recorded_by: patch.measurementRecordedBy }
        : {}),
      ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
      ...(patch.preferredFit !== undefined ? { preferred_fit: patch.preferredFit } : {}),
      ...(patch.totalPrice !== undefined ? { total_price: patch.totalPrice } : {}),
      ...(patch.depositPaid !== undefined ? { deposit_paid: patch.depositPaid } : {}),
      ...(patch.paymentMethod !== undefined ? { payment_method: patch.paymentMethod } : {}),
      ...(patch.paymentNotes !== undefined ? { payment_notes: patch.paymentNotes } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapMember(data as DbGroupProjectMember);
}
