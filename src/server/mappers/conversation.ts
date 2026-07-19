import type { Conversation, MessageAttachment, ThreadMessage } from "@/lib/conversations";
import type { Conversation as DbConversation, Message as DbMessage } from "@prisma/client";
import { parseJsonArray } from "@/server/mappers/json";

export function mapMessage(row: DbMessage): ThreadMessage {
  return {
    id: row.id,
    sender: row.sender as ThreadMessage["sender"],
    senderName: row.senderName,
    text: row.text,
    timestamp: row.timestamp,
    attachments: row.attachments
      ? parseJsonArray<MessageAttachment>(row.attachments)
      : undefined,
  };
}

export function mapConversation(
  row: DbConversation & { messages: DbMessage[] }
): Conversation {
  return {
    id: row.id,
    title: row.title,
    preview: row.preview,
    timestamp: row.timestamp,
    avatar: row.avatar ?? undefined,
    isGroup: row.isGroup,
    tag: row.tag ?? undefined,
    online: row.online,
    dimmed: row.dimmed,
    contactName: row.contactName,
    contactRole: row.contactRole as Conversation["contactRole"],
    contactAvatar: row.contactAvatar,
    dateLabel: row.dateLabel ?? undefined,
    messages: row.messages.map(mapMessage),
  };
}
