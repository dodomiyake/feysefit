import type { Message } from "./mock-data";
import { isLocalDemoMode } from "./config/backend";
import { designers, projects } from "./mock-data";

export interface MessageAttachment {
  id: string;
  type: "image" | "pdf" | "document";
  name: string;
  url?: string;
}

export interface ThreadMessage extends Message {
  attachments?: MessageAttachment[];
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
  avatar?: string;
  isGroup?: boolean;
  tag?: string;
  online?: boolean;
  dimmed?: boolean;
  contactName: string;
  contactRole: "designer" | "customer";
  contactAvatar: string;
  dateLabel?: string;
  messages: ThreadMessage[];
  /** Supabase `projects.id` — used for Realtime subscriptions */
  projectUuid?: string;
}

const EMBROIDERY_SKETCH =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDXj4AvnpUwXuoAudjZqJXJ-EABo8ITDwPhntcOXi3Ddj6mRA4Uw4ja8hdH1spNLP_ciWLiidrvMnMvVEnZDzEAuk3jmpfXHdjyL41sx3aTdcIcpeb6SxBPAvZDtqZrVkc1zJOpgHaB77ZlTDzlp9eqNrVE4FNmc0HBdKLLwBQlo3zNbYiZpLsw4UKRYUjmKm2qYl2Wgm99txzwYmqIkQHUkHjX8HWcI4_4vKZTaFECziw-2HvzDguS8Ks0kaOjhsf7PnaiHgD3Ow";

function buildLocalDemoConversations(): Conversation[] {
  const designer = designers[0];
  const project = projects[0];

  return [
    {
      id: "project-1",
      title: project.title,
      preview: `${designer.designerName.split(" ")[0]}: I've uploaded the silk swatches...`,
      timestamp: "10:45 AM",
      tag: "Bespoke",
      online: true,
      contactName: designer.designerName,
      contactRole: "designer",
      contactAvatar: designer.profileImage,
      dateLabel: "June 28, 2026",
      messages: [
        {
          id: "m1",
          sender: "customer",
          senderName: project.customerName,
          text: "I've reviewed the initial concepts. Can we consider a slightly more muted gold for the embroidery?",
          timestamp: "10:15 AM",
        },
        {
          id: "m2",
          sender: "designer",
          senderName: designer.designerName,
          text: "I've attached detail sketches for two thread options below.",
          timestamp: "10:20 AM",
          attachments: [
            {
              id: "a1",
              type: "image",
              name: "Embroidery_Concept_A.jpg",
              url: EMBROIDERY_SKETCH,
            },
            {
              id: "a2",
              type: "pdf",
              name: "Technical_Specs_V2.pdf",
            },
          ],
        },
      ],
    },
  ];
}

export const conversations: Conversation[] = isLocalDemoMode() ? buildLocalDemoConversations() : [];

export function buildMarketplaceConversation(designerId: string): Conversation | null {
  const d = designers.find((item) => item.id === designerId);
  if (!d) return null;

  return {
    id: `designer-${d.id}`,
    title: d.designerName,
    preview: "New marketplace enquiry",
    timestamp: "Just now",
    avatar: d.profileImage,
    tag: "Marketplace",
    online: true,
    contactName: d.designerName,
    contactRole: "designer",
    contactAvatar: d.profileImage,
    dateLabel: "Today",
    messages: [
      {
        id: "mp1",
        sender: "customer",
        senderName: "You",
        text: `Hi ${d.designerName.split(" ")[0]}, I'd like to discuss a custom design request from the marketplace.`,
        timestamp: "Just now",
      },
    ],
  };
}

export function getAllConversations(marketplace?: Conversation | null): Conversation[] {
  if (!marketplace) return conversations;
  const exists = conversations.some((c) => c.id === marketplace.id);
  if (exists) return conversations;
  return [marketplace, ...conversations];
}
