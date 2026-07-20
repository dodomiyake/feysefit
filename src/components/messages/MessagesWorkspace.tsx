"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConversationList } from "@/components/messages/ConversationList";
import { ConversationThread } from "@/components/messages/ConversationThread";
import {
  buildMarketplaceConversation,
  getAllConversations,
  type Conversation,
  type ThreadMessage,
  type MessageAttachment,
} from "@/lib/conversations";
import { isSupabaseEnabled } from "@/lib/config/backend";
import {
  listConversations,
  sendProjectMessage,
  getOrCreateDesignerConversation,
} from "@/lib/services/messageService";
import { api, isApiEnabled } from "@/lib/api/client";
import { useApp } from "@/context/AppContext";
import { useProjectMessagesRealtime } from "@/hooks/useProjectMessagesRealtime";
import { mergeMessageIntoConversations } from "@/lib/messages/merge-message";
import { cn } from "@/lib/cn";

function resolveActiveId(
  designerId: string | null,
  threadParam: string | null,
  conversations: Conversation[]
): string | null {
  if (designerId) return `designer-${designerId}`;
  if (threadParam) return threadParam;
  return conversations[0]?.id ?? null;
}

export function MessagesWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, authUser, role } = useApp();
  const useSupabase = isSupabaseEnabled();
  const useApi = isApiEnabled();

  const designerId = searchParams.get("designer");
  const threadParam = searchParams.get("thread");
  const draftParam = searchParams.get("draft");
  const showThreadOnMobile = Boolean(designerId || threadParam);

  const [apiConversations, setApiConversations] = useState<Conversation[] | null>(null);
  const [loading, setLoading] = useState(useApi || useSupabase);

  const loadConversations = useCallback(async () => {
    if (!useSupabase && !useApi) return;
    try {
      if (useSupabase) {
        if (designerId) {
          const thread = await getOrCreateDesignerConversation(
            designerId,
            authUser?.name ?? "You"
          );
          const list = await listConversations(authUser);
          const merged = list.some((c) => c.id === thread.id) ? list : [thread, ...list];
          setApiConversations(merged);
        } else {
          setApiConversations(await listConversations(authUser));
        }
      } else if (designerId) {
        const thread = await api.conversations.createDesignerThread(designerId);
        const list = await api.conversations.list({
          designerId: role === "designer" ? authUser?.designerId : undefined,
          customerId: role === "customer" ? authUser?.customerId : undefined,
        });
        const merged = list.some((c) => c.id === thread.id) ? list : [thread, ...list];
        setApiConversations(merged);
      } else {
        const list = await api.conversations.list({
          designerId: role === "designer" ? authUser?.designerId : undefined,
          customerId: role === "customer" ? authUser?.customerId : undefined,
        });
        setApiConversations(list);
      }
    } catch (error) {
      console.error("Failed to load conversations", error);
      setApiConversations([]);
    } finally {
      setLoading(false);
    }
  }, [useApi, useSupabase, designerId, role, authUser, setApiConversations]);

  const loadKey = `${useApi}:${useSupabase}:${designerId ?? ""}:${role ?? ""}:${authUser?.id ?? ""}`;
  const [prevLoadKey, setPrevLoadKey] = useState(loadKey);
  if (loadKey !== prevLoadKey) {
    setPrevLoadKey(loadKey);
    if (useApi || useSupabase) setLoading(true);
  }

  useEffect(() => {
    if (!useSupabase && !useApi) return;
    let cancelled = false;
    void (async () => {
      try {
        let next: Conversation[] = [];
        if (useSupabase) {
          if (designerId) {
            const thread = await getOrCreateDesignerConversation(
              designerId,
              authUser?.name ?? "You"
            );
            const list = await listConversations(authUser);
            next = list.some((c) => c.id === thread.id) ? list : [thread, ...list];
          } else {
            next = await listConversations(authUser);
          }
        } else if (designerId) {
          const thread = await api.conversations.createDesignerThread(designerId);
          const list = await api.conversations.list({
            designerId: role === "designer" ? authUser?.designerId : undefined,
            customerId: role === "customer" ? authUser?.customerId : undefined,
          });
          next = list.some((c) => c.id === thread.id) ? list : [thread, ...list];
        } else {
          next = await api.conversations.list({
            designerId: role === "designer" ? authUser?.designerId : undefined,
            customerId: role === "customer" ? authUser?.customerId : undefined,
          });
        }
        if (!cancelled) setApiConversations(next);
      } catch (error) {
        console.error("Failed to load conversations", error);
        if (!cancelled) setApiConversations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useApi, useSupabase, designerId, role, authUser]);

  const handleIncomingMessage = useCallback(
    (projectUuid: string, message: ThreadMessage) => {
      setApiConversations((prev) => {
        if (!prev) return prev;
        if (!prev.some((conversation) => conversation.projectUuid === projectUuid)) {
          void loadConversations();
          return prev;
        }
        return mergeMessageIntoConversations(prev, projectUuid, message);
      });
    },
    [loadConversations, setApiConversations]
  );

  useProjectMessagesRealtime(useSupabase && !loading, handleIncomingMessage);

  const marketplaceConversation = useMemo(
    () => (designerId && !useApi ? buildMarketplaceConversation(designerId) : null),
    [designerId, useApi]
  );

  const allConversations = useMemo(() => {
    if (useSupabase || useApi) return apiConversations ?? [];
    return getAllConversations(marketplaceConversation);
  }, [useSupabase, useApi, apiConversations, marketplaceConversation]);

  const activeId = resolveActiveId(designerId, threadParam, allConversations);

  const [search, setSearch] = useState("");
  const [composer, setComposer] = useState("");
  const draftAppliedRef = useRef(false);
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [extraMessages, setExtraMessages] = useState<Record<string, ThreadMessage[]>>({});

  useEffect(() => {
    if (!draftParam || draftAppliedRef.current) return;
    draftAppliedRef.current = true;
    setComposer(draftParam);
  }, [draftParam]);

  const activeConversation = useMemo((): Conversation | undefined => {
    const base = allConversations.find((c) => c.id === activeId) ?? allConversations[0];
    if (!base) return undefined;
    if (useSupabase) return base;
    const added = extraMessages[base.id] ?? [];
    if (added.length === 0) return base;
    return { ...base, messages: [...base.messages, ...added] };
  }, [activeId, allConversations, extraMessages, useSupabase]);

  const selectThread = useCallback(
    (id: string) => {
      const params = new URLSearchParams();
      if (id.startsWith("designer-")) {
        params.set("designer", id.replace("designer-", ""));
      } else {
        params.set("thread", id);
      }
      router.push(`/messages?${params.toString()}`);
    },
    [router]
  );

  const handleMobileBack = useCallback(() => {
    router.push("/messages");
  }, [router]);

  const handleSend = () => {
    const text = composer.trim();
    if ((!text && pendingAttachments.length === 0) || !activeConversation) return;
    if (activeConversation.readOnly) {
      showToast("This conversation is archived and read-only.", "error");
      return;
    }

    const senderRole = role === "designer" ? "designer" : "customer";
    const senderName =
      authUser?.name ?? (senderRole === "designer" ? "Designer" : "You");
    const attachments = pendingAttachments.length ? pendingAttachments : undefined;

    if (useSupabase) {
      void sendProjectMessage({
        conversationId: activeConversation.id,
        text,
        senderRole,
        senderName,
        senderUserId: authUser?.id,
        authUser,
        attachments,
      })
        .then((message) => {
          if (activeConversation.projectUuid) {
            setApiConversations((prev) =>
              prev
                ? mergeMessageIntoConversations(prev, activeConversation.projectUuid!, message)
                : prev
            );
          } else {
            void loadConversations();
          }
        })
        .catch(() => showToast("Could not send message"));
      setComposer("");
      setPendingAttachments([]);
      return;
    }

    if (useApi) {
      void api.conversations
        .sendMessage(activeConversation.id, {
          text,
          sender: senderRole,
          senderName,
        })
        .then((message) => {
          setExtraMessages((prev) => ({
            ...prev,
            [activeConversation.id]: [...(prev[activeConversation.id] ?? []), message],
          }));
          void loadConversations();
        });
      setComposer("");
      showToast("Message sent");
      return;
    }

    const newMessage: ThreadMessage = {
      id: `local-${Date.now()}`,
      sender: "customer",
      senderName: "You",
      text,
      timestamp: "Just now",
    };

    setExtraMessages((prev) => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] ?? []), newMessage],
    }));
    setComposer("");
    showToast("Message sent");
  };

  const marketplaceHref =
    designerId && activeConversation?.tag === "Marketplace"
      ? `/marketplace/${designerId}`
      : undefined;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-ink-muted">
        Loading messages...
      </div>
    );
  }

  if (allConversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-base font-medium text-primary">No conversations yet</p>
        <p className="max-w-md text-sm text-ink-muted">
          {role === "designer"
            ? "Invite a client or create a project — linked clients appear here so you can message them directly."
            : "Once your designer links you to a project, your conversation will show up here."}
        </p>
        {role === "designer" && (
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/invite"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Invite client
            </Link>
            <Link
              href="/projects/new"
              className="rounded-full border border-primary/20 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-surface-container"
            >
              New project
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (!activeConversation) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-ink-muted">
        No conversations yet.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] overflow-hidden lg:h-[calc(100vh-4rem)]">
      <div
        className={cn(
          "h-full w-full shrink-0 lg:flex lg:w-2/5 lg:max-w-md",
          showThreadOnMobile ? "hidden" : "flex"
        )}
      >
        <ConversationList
          conversations={allConversations}
          activeId={activeConversation.id}
          search={search}
          onSearchChange={setSearch}
          onSelect={selectThread}
        />
      </div>

      <div
        className={cn(
          "h-full min-w-0 flex-1",
          showThreadOnMobile ? "flex" : "hidden lg:flex"
        )}
      >
        <ConversationThread
          conversation={activeConversation}
          composerValue={composer}
          onComposerChange={setComposer}
          onSend={handleSend}
          pendingAttachments={pendingAttachments}
          onAttachmentsChange={setPendingAttachments}
          showMobileBack={showThreadOnMobile}
          onMobileBack={handleMobileBack}
          marketplaceProfileHref={marketplaceHref}
          live={useSupabase}
        />
      </div>
    </div>
  );
}
