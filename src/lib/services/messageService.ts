import type { Json } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import {
  buildProjectConversation,
  mapDesigner,
  mapThreadMessage,
} from "@/lib/supabase/mappers";
import type { Conversation } from "@/lib/conversations";
import type { MessageAttachment } from "@/lib/conversations";
import { buildMessageNotifications, type AppNotification } from "@/lib/notifications";
import { formatTimestamp } from "@/lib/services/authService";
import {
  getCustomerById,
  listCustomersForDesigner,
  resolveCustomerProfileId,
} from "@/lib/services/customerService";
import {
  PUBLIC_DESIGNER_PROFILE_SELECT,
  resolveDesignerProfileId,
} from "@/lib/services/designerService";
import { listProjects } from "@/lib/services/projectService";
import { isConversationReadOnly } from "@/lib/unlink-guards";
import type { Designer } from "@/lib/mock-data";

type MessageAuthUser = {
  id: string;
  name: string;
  role: string;
  designerId?: string;
  customerId?: string;
};

function resolveAvatarUrl(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort((a, b) => {
    const aHasMessages = a.messages.length > 0;
    const bHasMessages = b.messages.length > 0;
    if (aHasMessages !== bHasMessages) return aHasMessages ? -1 : 1;
    return 0;
  });
}

async function findMessagingProject(input: {
  designerLegacyId: string;
  customerLegacyId: string;
  customerName: string;
}) {
  const supabase = createClient();
  const designerProfileId = await resolveDesignerProfileId(input.designerLegacyId);
  const customerProfileId = await resolveCustomerProfileId(input.customerLegacyId);
  if (!designerProfileId || !customerProfileId) {
    throw new Error("Could not resolve designer or customer profile");
  }

  const { data: existing } = await supabase
    .from("projects")
    .select("id, legacy_id")
    .eq("designer_id", designerProfileId)
    .eq("customer_id", customerProfileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      projectUuid: existing.id,
      projectLegacyId: existing.legacy_id ?? existing.id,
    };
  }

  throw new Error(
    "Your enquiry must be accepted and the designer must create the project before messaging opens."
  );
}

async function resolveProjectForConversation(
  conversationId: string,
  authUser: MessageAuthUser | null | undefined
) {
  if (conversationId.startsWith("project-")) {
    const projectLegacyId = conversationId.replace(/^project-/, "");
    const supabase = createClient();
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .or(legacyOrIdFilter(projectLegacyId))
      .maybeSingle();
    if (!project) throw new Error("Project not found");
    return { projectUuid: project.id, projectLegacyId };
  }

  if (conversationId.startsWith("client-")) {
    const customerLegacyId = conversationId.replace(/^client-/, "");
    if (!authUser?.designerId) throw new Error("Designer account required");
    const customers = await listCustomersForDesigner(authUser.designerId);
    const customer = customers.find((c) => c.id === customerLegacyId);
    if (!customer) throw new Error("Client not found");
    return findMessagingProject({
      designerLegacyId: authUser.designerId,
      customerLegacyId,
      customerName: customer.name,
    });
  }

  if (conversationId.startsWith("designer-")) {
    const designerLegacyId = conversationId.replace(/^designer-/, "");
    if (!authUser?.customerId) throw new Error("Customer account required");
    return findMessagingProject({
      designerLegacyId,
      customerLegacyId: authUser.customerId,
      customerName: authUser.name,
    });
  }

  throw new Error("Unknown conversation");
}

export async function listConversations(
  authUser: MessageAuthUser | null
): Promise<Conversation[]> {
  if (!authUser) return [];

  const projects = await listProjects();
  const supabase = createClient();
  const conversations: Conversation[] = [];
  const viewerRole = authUser.role === "designer" ? "designer" : "customer";

  const customerAvatarById = new Map<string, string>();
  if (authUser.role === "designer" && authUser.designerId) {
    const clients = await listCustomersForDesigner(authUser.designerId);
    for (const client of clients) {
      const avatar = resolveAvatarUrl(client.profileImage);
      if (avatar) customerAvatarById.set(client.id, avatar);
    }
  } else if (authUser.role === "customer" && authUser.customerId) {
    const self = await getCustomerById(authUser.customerId);
    const avatar = resolveAvatarUrl(self?.profileImage);
    if (avatar) customerAvatarById.set(authUser.customerId, avatar);
  }

  for (const project of projects) {
    const { data: row } = await supabase
      .from("projects")
      .select("id, designer_id, customer_id")
      .or(legacyOrIdFilter(project.id))
      .maybeSingle();
    if (!row) continue;

    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("project_id", row.id)
      .order("created_at", { ascending: true });

    let designer: Designer | undefined;
    if (row.designer_id) {
      const { data: designerRow } = await supabase
        .from("designer_profiles")
        .select(PUBLIC_DESIGNER_PROFILE_SELECT)
        .eq("id", row.designer_id)
        .maybeSingle();
      if (designerRow) {
        designer = mapDesigner(designerRow);
      }
    }
    if (!designer) continue;

    let customerAvatar =
      (project.customerId ? customerAvatarById.get(project.customerId) : undefined) ??
      undefined;

    if (!customerAvatar && row.customer_id) {
      const { data: customerRow } = await supabase
        .from("customer_profiles")
        .select("profile_image, legacy_id")
        .eq("id", row.customer_id)
        .maybeSingle();
      customerAvatar = resolveAvatarUrl(customerRow?.profile_image);
      if (customerAvatar) {
        if (customerRow?.legacy_id) customerAvatarById.set(customerRow.legacy_id, customerAvatar);
        if (project.customerId) customerAvatarById.set(project.customerId, customerAvatar);
      }
    }

    const designerAvatar = resolveAvatarUrl(designer.profileImage);

    conversations.push(
      buildProjectConversation(
        project,
        (messages ?? []).map(mapThreadMessage),
        { ...designer, profileImage: designerAvatar ?? designer.profileImage },
        viewerRole,
        customerAvatar,
        row.id
      )
    );
  }

  // Accepted relationships without projects deliberately do not appear as
  // message threads. The designer creates the project from the enquiry first.

  if (authUser.role === "customer" && authUser.customerId) {
    return sortConversations(
      conversations.map((conversation) => {
        const project = projects.find((p) => `project-${p.id}` === conversation.id);
        const readOnly = isConversationReadOnly({
          relationshipArchivedAt: project?.relationshipArchivedAt,
          linkedDesignerId: project?.relationshipArchivedAt ? null : "active",
        });
        if (!readOnly) return conversation;
        return {
          ...conversation,
          readOnly: true,
          archived: true,
          tag: "Archived",
          dimmed: true,
        };
      })
    );
  }

  return sortConversations(
    conversations.map((conversation) => {
      const project = projects.find((p) => `project-${p.id}` === conversation.id);
      if (!project?.relationshipArchivedAt) return conversation;
      return {
        ...conversation,
        readOnly: true,
        archived: true,
        tag: "Archived",
        dimmed: true,
      };
    })
  );
}

export async function sendProjectMessage(input: {
  conversationId: string;
  text: string;
  senderRole: "designer" | "customer";
  senderName: string;
  senderUserId?: string;
  authUser?: MessageAuthUser | null;
  attachments?: MessageAttachment[];
}) {
  const trimmedText = input.text.trim();
  if (!trimmedText && !(input.attachments?.length ?? 0)) {
    throw new Error("Message cannot be empty");
  }

  const { projectUuid } = await resolveProjectForConversation(
    input.conversationId,
    input.authUser
  );

  const supabase = createClient();
  const { data: projectRow } = await supabase
    .from("projects")
    .select("relationship_archived_at, customer_id, designer_id")
    .eq("id", projectUuid)
    .maybeSingle();
  if (projectRow?.relationship_archived_at) {
    throw new Error("This conversation is archived and read-only after unlinking.");
  }

  if (input.authUser?.customerId) {
    const customerProfileId = await resolveCustomerProfileId(input.authUser.customerId);
    const { data: relationship } = customerProfileId
      ? await supabase
          .from("designer_customer_relationships")
          .select("id")
          .eq("customer_id", customerProfileId)
          .eq("designer_id", projectRow?.designer_id ?? "")
          .eq("is_active", true)
          .maybeSingle()
      : { data: null };
    if (!relationship) throw new Error("This designer relationship is not active.");
  }

  const { data, error } = await supabase
        .from("messages")
        .insert({
          project_id: projectUuid,
          sender_user_id: input.senderUserId,
          sender_role: input.senderRole,
          sender_name: input.senderName,
          text: trimmedText,
          timestamp_label: formatTimestamp(),
          attachments: input.attachments?.length
            ? (input.attachments as unknown as Json)
            : null,
        })
        .select("*")
        .single();
  if (error) throw new Error(error.message);
  return mapThreadMessage(data);
}

export async function listMessageNotifications(
  authUser: MessageAuthUser | null
): Promise<AppNotification[]> {
  if (!authUser || (authUser.role !== "designer" && authUser.role !== "customer")) {
    return [];
  }

  const conversations = await listConversations(authUser);
  const viewerRole = authUser.role === "designer" ? "designer" : "customer";
  return buildMessageNotifications(conversations, viewerRole);
}
