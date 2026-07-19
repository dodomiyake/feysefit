"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { listMessageNotifications } from "@/lib/services/messageService";
import { useProjectMessagesRealtime } from "@/hooks/useProjectMessagesRealtime";
import { useProjectsRealtime } from "@/hooks/useProjectsRealtime";
import type { ThreadMessage } from "@/lib/conversations";
import {
  buildNotifications,
  readStoredNotificationIds,
  storeReadNotificationIds,
  type AppNotification,
} from "@/lib/notifications";

interface NotificationButtonProps {
  /** Mobile top bar uses fixed panel positioning */
  variant?: "header" | "mobile";
  className?: string;
}

export function NotificationButton({ variant = "header", className }: NotificationButtonProps) {
  const router = useRouter();
  const {
    role,
    hydrated,
    authUser,
    customerLink,
    projects,
    unlinkRequests,
    userReports,
    getDesignerPendingConfirmations,
    getPendingMarketplaceApprovals,
    syncProjects,
  } = useApp();
  const useSupabase = isSupabaseEnabled();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : readStoredNotificationIds()
  );
  const [messageNotifications, setMessageNotifications] = useState<AppNotification[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadMessageNotifications = useCallback(async () => {
    if (!useSupabase || !authUser) {
      setMessageNotifications([]);
      return;
    }
    try {
      const items = await listMessageNotifications(authUser);
      setMessageNotifications(items);
    } catch {
      setMessageNotifications([]);
    }
  }, [authUser, useSupabase]);

  useEffect(() => {
    if (!useSupabase || !authUser) return;
    let cancelled = false;
    void listMessageNotifications(authUser)
      .then((items) => {
        if (!cancelled) setMessageNotifications(items);
      })
      .catch(() => {
        if (!cancelled) setMessageNotifications([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser, useSupabase]);

  useEffect(() => {
    if (!open || !useSupabase || !authUser) return;
    let cancelled = false;
    void listMessageNotifications(authUser)
      .then((items) => {
        if (!cancelled) setMessageNotifications(items);
      })
      .catch(() => {
        if (!cancelled) setMessageNotifications([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, authUser, useSupabase]);

  const handleIncomingMessage = useCallback(
    (_projectUuid: string, message: ThreadMessage) => {
      if (!role) return;
      const viewerRole = role === "designer" ? "designer" : "customer";
      if (message.sender === viewerRole) return;
      void loadMessageNotifications();
    },
    [loadMessageNotifications, role]
  );

  useProjectMessagesRealtime(
    useSupabase && hydrated && Boolean(authUser) && (role === "designer" || role === "customer"),
    handleIncomingMessage,
    "message-notifications-live"
  );

  const handleProjectChange = useCallback(() => {
    void syncProjects();
  }, [syncProjects]);

  useProjectsRealtime(
    useSupabase && hydrated && Boolean(authUser) && (role === "designer" || role === "customer"),
    handleProjectChange,
    "project-notifications-live"
  );

  const staticNotifications = useMemo(() => {
    if (!hydrated) return [];
    return buildNotifications({
      role,
      customerId: authUser?.customerId,
      customerName: authUser?.name,
      customerLink,
      projects,
      unlinkRequests,
      userReports,
      getDesignerPendingConfirmations,
      getPendingMarketplaceApprovals,
    });
  }, [
    hydrated,
    role,
    authUser?.customerId,
    authUser?.name,
    customerLink,
    projects,
    unlinkRequests,
    userReports,
    getDesignerPendingConfirmations,
    getPendingMarketplaceApprovals,
  ]);

  const notifications = useMemo(() => {
    const seen = new Set<string>();
    const merged: AppNotification[] = [];
    for (const item of [...messageNotifications, ...staticNotifications]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
    return merged;
  }, [messageNotifications, staticNotifications]);

  const unread = useMemo(
    () => notifications.filter((n) => !readIds.includes(n.id)),
    [notifications, readIds]
  );

  const unreadCount = unread.length;

  const persistRead = useCallback((ids: string[]) => {
    setReadIds(ids);
    storeReadNotificationIds(ids);
  }, []);

  const markRead = useCallback(
    (id: string) => {
      if (readIds.includes(id)) return;
      persistRead([...readIds, id]);
    },
    [persistRead, readIds]
  );

  const markAllRead = useCallback(() => {
    const allIds = Array.from(new Set([...readIds, ...notifications.map((n) => n.id)]));
    persistRead(allIds);
  }, [notifications, persistRead, readIds]);

  const handleSelect = (notification: AppNotification) => {
    markRead(notification.id);
    setOpen(false);
    router.push(notification.href);
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  if (!hydrated || !role) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "relative rounded-full p-2 text-primary/30",
          className
        )}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-full p-2 text-primary transition-colors hover:bg-primary/5"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "z-50 overflow-hidden rounded-xl border border-primary/10 bg-background shadow-warm",
            variant === "mobile"
              ? "fixed right-5 top-14 w-[min(100vw-2.5rem,20rem)]"
              : "absolute right-0 top-full mt-2 w-80"
          )}
        >
          <div className="flex items-center justify-between border-b border-primary/10 px-4 py-3">
            <p className="text-sm font-semibold text-primary">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-accent hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-primary/50">
                You&apos;re all caught up.
              </p>
            ) : (
              <ul className="divide-y divide-primary/5">
                {notifications.map((notification) => {
                  const isUnread = !readIds.includes(notification.id);
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(notification)}
                        className={cn(
                          "w-full px-4 py-3 text-left transition-colors hover:bg-card/60",
                          isUnread && "bg-highlight/10"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-primary">{notification.title}</p>
                          {isUnread && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-primary/60">
                          {notification.body}
                        </p>
                        <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-primary/40">
                          {notification.time}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-primary/10 px-4 py-2.5">
              <Link
                href={role === "admin" ? "/dashboard/admin" : "/messages"}
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-accent hover:underline"
              >
                View all activity
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
