"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageBubble } from "@/components/ui/MessageBubble";
import { MessageAttachments } from "@/components/messages/MessageAttachments";
import { MessageComposer } from "@/components/messages/MessageComposer";
import type { Conversation, MessageAttachment } from "@/lib/conversations";
import { useApp } from "@/context/AppContext";
import { resolveCurrentCustomer } from "@/lib/customer-display";
import { Info, Phone, Video, ArrowLeft, Users } from "lucide-react";
import { cn } from "@/lib/cn";

interface ConversationThreadProps {
  conversation: Conversation;
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSend: () => void;
  pendingAttachments: MessageAttachment[];
  onAttachmentsChange: (attachments: MessageAttachment[]) => void;
  showMobileBack?: boolean;
  onMobileBack?: () => void;
  marketplaceProfileHref?: string;
  live?: boolean;
}

export function ConversationThread({
  conversation,
  composerValue,
  onComposerChange,
  onSend,
  pendingAttachments,
  onAttachmentsChange,
  showMobileBack,
  onMobileBack,
  marketplaceProfileHref,
  live = false,
}: ConversationThreadProps) {
  const { showToast, role, authUser, customers, getDesignerById } = useApp();
  const roleLabel = conversation.contactRole === "designer" ? "Designer" : "Client";
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageCount = conversation.messages.length;
  const viewerRole = role === "designer" ? "designer" : "customer";

  const viewerAvatar = useMemo(() => {
    if (role === "customer") {
      return resolveCurrentCustomer(customers, authUser)?.profileImage?.trim() || undefined;
    }
    if (role === "designer" && authUser?.designerId) {
      return getDesignerById(authUser.designerId)?.profileImage?.trim() || undefined;
    }
    return undefined;
  }, [role, authUser, customers, getDesignerById]);

  const contactAvatar = conversation.contactAvatar?.trim() || undefined;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messageCount, conversation.id]);

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#d3c3ba]/20 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {showMobileBack && onMobileBack && (
            <button
              type="button"
              onClick={onMobileBack}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/10",
                "bg-background/90 text-primary shadow-warm transition-colors hover:bg-surface-container"
              )}
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#d3c3ba]/20">
            {conversation.isGroup ? (
              <div className="flex h-full w-full items-center justify-center bg-highlight/30 text-primary">
                <Users className="h-5 w-5" />
              </div>
            ) : contactAvatar ? (
              <Image
                src={contactAvatar}
                alt={conversation.contactName}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-card text-sm font-semibold text-primary">
                {conversation.contactName.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-primary">
              {conversation.contactName}
            </h3>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                live ? "bg-accent/15 text-accent" : "bg-highlight/15 text-accent"
              )}
            >
              {live && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
              )}
              {live ? "Live" : roleLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => showToast("Voice call coming soon")}
            className="rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-container"
            aria-label="Start voice call"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => showToast("Video call coming soon")}
            className="rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-container"
            aria-label="Start video call"
          >
            <Video className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => showToast("Conversation details coming soon")}
            className="rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-container"
            aria-label="Conversation info"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </header>

      {marketplaceProfileHref && (
        <div className="border-b border-[#d3c3ba]/15 bg-surface/50 px-4 py-2 lg:px-6">
          <Link href={marketplaceProfileHref} className="text-xs font-medium text-accent hover:underline">
            View designer profile
          </Link>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 space-y-6 overflow-y-auto p-4 lg:p-6"
        style={{
          backgroundImage: "radial-gradient(#efe3d0 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {conversation.dateLabel && (
          <div className="flex justify-center">
            <span className="rounded-full bg-surface px-4 py-1 text-[10px] font-semibold uppercase tracking-tight text-ink-muted/70">
              {conversation.dateLabel}
            </span>
          </div>
        )}
        {conversation.messages.map((message) => {
          const isOwnMessage = message.sender === viewerRole;
          const senderAvatar = isOwnMessage ? viewerAvatar : contactAvatar;

          return (
          <div key={message.id} className="space-y-4">
            {message.text && (
              <MessageBubble message={message} senderAvatar={senderAvatar} />
            )}
            {message.attachments && message.attachments.length > 0 && (
              <div className={message.sender === "customer" ? "flex justify-end" : ""}>
                <MessageAttachments attachments={message.attachments} />
              </div>
            )}
          </div>
        );
        })}
      </div>

      <MessageComposer
        value={composerValue}
        onChange={onComposerChange}
        onSend={onSend}
        pendingAttachments={pendingAttachments}
        onAttachmentsChange={onAttachmentsChange}
        projectId={conversation.projectUuid}
      />
    </section>
  );
}
