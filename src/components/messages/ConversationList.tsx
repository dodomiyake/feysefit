"use client";

import Image from "next/image";
import { Users } from "lucide-react";
import type { Conversation } from "@/lib/conversations";
import { cn } from "@/lib/cn";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  search,
  onSearchChange,
  onSelect,
}: ConversationListProps) {
  const query = search.trim().toLowerCase();
  const filtered = query
    ? conversations.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.preview.toLowerCase().includes(query) ||
          c.contactName.toLowerCase().includes(query)
      )
    : conversations;

  return (
    <aside className="flex h-full w-full flex-col border-[#d3c3ba]/20 bg-surface lg:border-r">
      <div className="hidden border-b border-[#d3c3ba]/20 p-4 lg:block lg:p-6">
        <h2 className="font-headline text-xl font-semibold text-primary">Conversations</h2>
        <div className="mt-4 flex items-center gap-2 rounded-full border border-[#d3c3ba]/30 bg-background px-4 py-2 focus-within:ring-1 focus-within:ring-accent">
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-transparent text-sm text-primary placeholder:text-ink-muted/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="border-b border-[#d3c3ba]/20 p-4 lg:hidden">
        <h2 className="font-headline text-lg font-semibold text-primary">Conversations</h2>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search conversations..."
          className="mt-3 w-full rounded-full border border-[#d3c3ba]/30 bg-background px-4 py-2.5 text-sm text-primary placeholder:text-ink-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map((conversation) => {
          const isActive = conversation.id === activeId;
          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={cn(
                "w-full border-l-4 p-5 text-left transition-all lg:p-6",
                isActive
                  ? "border-accent bg-surface-container"
                  : "border-transparent hover:bg-surface-container/80",
                conversation.dimmed && !isActive && "opacity-60"
              )}
            >
              <div className="flex gap-4">
                <div className="relative shrink-0">
                  {conversation.isGroup ? (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-highlight/30 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className="relative h-12 w-12 overflow-hidden rounded-full">
                      {conversation.avatar ? (
                        <Image
                          src={conversation.avatar}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-card text-sm font-semibold text-primary">
                          {conversation.title.charAt(0)}
                        </div>
                      )}
                    </div>
                  )}
                  {conversation.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-green-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-primary">
                      {conversation.title}
                    </span>
                    <span className="shrink-0 text-xs text-ink-muted/60">
                      {conversation.timestamp}
                    </span>
                  </div>
                  <p className="line-clamp-1 text-sm text-ink-muted">{conversation.preview}</p>
                  {conversation.tag && (
                    <span className="mt-2 inline-block rounded-full bg-highlight/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {conversation.tag}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
