import type { Conversation, ThreadMessage } from "@/lib/conversations";

function previewForMessage(message: ThreadMessage) {
  const name = message.senderName.split(" ")[0] ?? message.senderName;
  const snippet = message.text.length > 48 ? `${message.text.slice(0, 48)}...` : message.text;
  return `${name}: ${snippet}`;
}

export function mergeMessageIntoConversations(
  conversations: Conversation[],
  projectUuid: string,
  message: ThreadMessage
): Conversation[] {
  const index = conversations.findIndex((conversation) => conversation.projectUuid === projectUuid);
  if (index === -1) return conversations;

  const conversation = conversations[index];
  if (conversation.messages.some((existing) => existing.id === message.id)) {
    return conversations;
  }

  const updated: Conversation = {
    ...conversation,
    messages: [...conversation.messages, message],
    preview: previewForMessage(message),
    timestamp: message.timestamp,
  };

  const next = [...conversations];
  next.splice(index, 1);
  return [updated, ...next];
}
