import type { Json } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import {
  buildProjectConversation,
  mapDesigner,
  mapThreadMessage,
} from "@/lib/supabase/mappers";
import type { Conversation, ThreadMessage } from "@/lib/conversations";
import type { MessageAttachment } from "@/lib/conversations";
import { buildMessageNotifications, type AppNotification } from "@/lib/notifications";
import { formatTimestamp } from "@/lib/services/authService";
import {
  getCustomerById,
  getCustomerLinkState,
  listCustomersForDesigner,
  resolveCustomerProfileId,
} from "@/lib/services/customerService";
import { getDesignerById, listDesigners, resolveDesignerProfileId } from "@/lib/services/designerService";
import { createProject, listProjects } from "@/lib/services/projectService";
import { runSensitiveAction } from "@/lib/security/sensitive-rate-limit";
import { isConversationReadOnly } from "@/lib/unlink-guards";
import type { Customer, Designer } from "@/lib/mock-data";

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

function buildClientConversation(customer: Customer): Conversation {
  const avatar = resolveAvatarUrl(customer.profileImage);
  return {
    id: `client-${customer.id}`,
    title: customer.name,
    preview: "Start a conversation with your client",
    timestamp: "New",
    tag: "Client",
    online: true,
    contactName: customer.name,
    contactRole: "customer",
    avatar,
    contactAvatar: avatar ?? "",
    dateLabel: "Today",
    messages: [],
  };
}

function buildLinkedDesignerConversation(designer: Designer): Conversation {
  const avatar = resolveAvatarUrl(designer.profileImage);
  return {
    id: `designer-${designer.id}`,
    title: designer.designerName,
    preview: "Message your designer",
    timestamp: "New",
    tag: "Linked",
    online: true,
    contactName: designer.designerName,
    contactRole: "designer",
    avatar,
    contactAvatar: avatar ?? "",
    dateLabel: "Today",
    messages: [],
  };
}

function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort((a, b) => {
    const aHasMessages = a.messages.length > 0;
    const bHasMessages = b.messages.length > 0;
    if (aHasMessages !== bHasMessages) return aHasMessages ? -1 : 1;
    return 0;
  });
}

async function findOrCreateMessagingProject(input: {
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

  const link = await getCustomerLinkState(input.customerLegacyId);
  if (!link.linkedDesignerId || link.linkedDesignerId !== input.designerLegacyId) {
    throw new Error("You can only message your linked designer while the relationship is active.");
  }

  const project = await createProject({
    title: `${input.customerName} — Messages`,
    customerId: input.customerLegacyId,
    customerName: input.customerName,
    outfitType: "General",
    deadline: "TBD",
    budget: "TBD",
    designerProfileId,
    customerUpdate: "Say hello to start your bespoke journey.",
  });

  const { data: row } = await supabase
    .from("projects")
    .select("id, legacy_id")
    .or(legacyOrIdFilter(project.id))
    .maybeSingle();
  if (!row) throw new Error("Project not found after creation");

  return {
    projectUuid: row.id,
    projectLegacyId: row.legacy_id ?? row.id,
  };
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
    return findOrCreateMessagingProject({
      designerLegacyId: authUser.designerId,
      customerLegacyId,
      customerName: customer.name,
    });
  }

  if (conversationId.startsWith("designer-")) {
    const designerLegacyId = conversationId.replace(/^designer-/, "");
    if (!authUser?.customerId) throw new Error("Customer account required");
    return findOrCreateMessagingProject({
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
  const coveredCustomerIds = new Set<string>();
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
        .select("*")
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

    if (project.customerId) {
      coveredCustomerIds.add(project.customerId);
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

  if (authUser.role === "designer" && authUser.designerId) {
    const customers = await listCustomersForDesigner(authUser.designerId);
    for (const customer of customers) {
      if (coveredCustomerIds.has(customer.id)) continue;
      conversations.push(buildClientConversation(customer));
    }
  }

  if (authUser.role === "customer" && authUser.customerId && conversations.length === 0) {
    const link = await getCustomerLinkState(authUser.customerId);
    if (link.linkedDesignerId) {
      const designer = await getDesignerById(link.linkedDesignerId);
      if (designer) {
        conversations.push(buildLinkedDesignerConversation(designer));
      }
    }
  }

  if (authUser.role === "customer" && authUser.customerId) {
    const link = await getCustomerLinkState(authUser.customerId);
    return sortConversations(
      conversations.map((conversation) => {
        const project = projects.find((p) => `project-${p.id}` === conversation.id);
        const readOnly = isConversationReadOnly({
          relationshipArchivedAt: project?.relationshipArchivedAt,
          linkedDesignerId: link.linkedDesignerId,
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
    const link = await getCustomerLinkState(input.authUser.customerId);
    if (!link.linkedDesignerId) {
      throw new Error("Link with your designer again before sending new messages.");
    }
  }

  const { data, error } = await runSensitiveAction(
    "messagingWrite",
    input.senderUserId ?? input.authUser?.id ?? projectUuid,
    () =>
      supabase
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
        .single()
  );
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

export async function getOrCreateDesignerConversation(
  designerLegacyId: string,
  customerName: string
): Promise<Conversation> {
  const designers = await listDesigners();
  const designer = designers.find((d) => d.id === designerLegacyId);
  if (!designer) throw new Error("Designer not found");

  return {
    id: `designer-${designer.id}`,
    title: designer.designerName,
    preview: "New marketplace enquiry",
    timestamp: "Just now",
    avatar: resolveAvatarUrl(designer.profileImage),
    tag: "Marketplace",
    online: true,
    contactName: designer.designerName,
    contactRole: "designer",
    contactAvatar: resolveAvatarUrl(designer.profileImage) ?? "",
    dateLabel: "Today",
    messages: [
      {
        id: `mp-${designer.id}`,
        sender: "customer",
        senderName: customerName,
        text: `Hi ${designer.designerName.split(" ")[0]}, I'd like to discuss a custom design request from the marketplace.`,
        timestamp: "Just now",
      },
    ],
  };
}
