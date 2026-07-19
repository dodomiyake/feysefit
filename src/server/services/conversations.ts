import type { Conversation, ThreadMessage } from "@/lib/conversations";
import { designers } from "@/lib/mock-data";
import { prisma } from "@/server/db";
import { mapConversation, mapMessage } from "@/server/mappers/conversation";
import { toJson } from "@/server/mappers/json";

const conversationInclude = { messages: { orderBy: { timestamp: "asc" as const } } } as const;

function formatMessageTimestamp() {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export async function listConversations(filters?: { designerId?: string; customerId?: string }) {
  const rows = await prisma.conversation.findMany({
    where: {
      ...(filters?.designerId ? { designerId: filters.designerId } : {}),
      ...(filters?.customerId ? { customerId: filters.customerId } : {}),
    },
    include: conversationInclude,
    orderBy: { timestamp: "desc" },
  });
  return rows.map(mapConversation);
}

export async function getConversationById(conversationId: string) {
  const row = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: conversationInclude,
  });
  return row ? mapConversation(row) : null;
}

export async function getOrCreateDesignerConversation(designerId: string): Promise<Conversation> {
  const conversationId = `designer-${designerId}`;
  const existing = await getConversationById(conversationId);
  if (existing) return existing;

  const designer = designers.find((d) => d.id === designerId);
  if (!designer) {
    throw new Error("Designer not found");
  }

  const row = await prisma.conversation.create({
    data: {
      id: conversationId,
      title: designer.designerName,
      preview: "New marketplace enquiry",
      timestamp: "Just now",
      avatar: designer.profileImage,
      tag: "Marketplace",
      online: true,
      contactName: designer.designerName,
      contactRole: "designer",
      contactAvatar: designer.profileImage,
      dateLabel: "Today",
      designerId,
      messages: {
        create: {
          id: `mp-${designerId}`,
          sender: "customer",
          senderName: "You",
          text: `Hi ${designer.designerName.split(" ")[0]}, I'd like to discuss a custom design request from the marketplace.`,
          timestamp: "Just now",
        },
      },
    },
    include: conversationInclude,
  });

  return mapConversation(row);
}

export async function addMessageToConversation(
  conversationId: string,
  input: {
    id?: string;
    sender: ThreadMessage["sender"];
    senderName: string;
    text: string;
    timestamp?: string;
    attachments?: ThreadMessage["attachments"];
  }
) {
  const timestamp = input.timestamp ?? formatMessageTimestamp();
  const message = await prisma.message.create({
    data: {
      id: input.id ?? `m-${Date.now()}`,
      conversationId,
      sender: input.sender,
      senderName: input.senderName,
      text: input.text,
      timestamp,
      attachments: input.attachments ? toJson(input.attachments) : null,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      preview: `${input.senderName.split(" ")[0]}: ${input.text.slice(0, 48)}${input.text.length > 48 ? "..." : ""}`,
      timestamp,
    },
  });

  return mapMessage(message);
}
