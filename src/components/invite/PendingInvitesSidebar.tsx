"use client";

import { useCallback, useEffect, useState } from "react";
import type { PendingInvite } from "@/lib/mock-data";
import { useApp } from "@/context/AppContext";
import { isApiEnabled, isSupabaseEnabled } from "@/lib/config/backend";
import { buildInviteJoinUrl } from "@/lib/invite-link";
import { cancelInvite, listInvites } from "@/lib/services/inviteService";
import { InviteLinkCopy } from "@/components/invite/InviteLinkCopy";
import { User, X } from "lucide-react";

interface PendingInvitesSidebarProps {
  refreshKey?: number;
}

export function PendingInvitesSidebar({ refreshKey = 0 }: PendingInvitesSidebarProps) {
  const { showToast, authUser } = useApp();
  const useSupabase = isSupabaseEnabled();
  const useApi = isApiEnabled();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadInvites = useCallback(() => {
    if (!useSupabase && !useApi) return;
    if (!authUser?.designerId) return;
    void listInvites(authUser.designerId)
      .then((rows) => setInvites(rows.filter((invite) => invite.status === "pending")))
      .catch(() => undefined);
  }, [useSupabase, useApi, authUser?.designerId]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites, refreshKey]);

  const handleCancel = (invite: PendingInvite) => {
    if (useSupabase) {
      void cancelInvite(invite.id)
        .then(() => {
          setInvites((current) => current.filter((item) => item.id !== invite.id));
          if (expandedId === invite.id) setExpandedId(null);
          showToast("Invite cancelled");
        })
        .catch((error) => {
          showToast(error instanceof Error ? error.message : "Could not cancel invite", "error");
        });
      return;
    }

    setInvites((current) => current.filter((item) => item.id !== invite.id));
    showToast("Invite cancelled");
  };

  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm">
      <div className="mb-5 flex items-center justify-between gap-2">
        <h3 className="font-headline text-lg font-semibold text-primary">Pending Invites</h3>
        <span className="rounded bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
          {invites.length} Total
        </span>
      </div>

      {invites.length === 0 ? (
        <p className="text-sm text-ink-muted">No pending invitations.</p>
      ) : (
        <ul className="space-y-3">
          {invites.map((invite) => {
            const isExpanded = expandedId === invite.id;
            return (
              <li
                key={invite.id}
                className="rounded-lg border border-[#d3c3ba]/20 bg-background/60 p-4 transition-colors hover:bg-background"
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : invite.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-accent">
                      <User className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary">{invite.name}</p>
                      <p className="text-xs text-ink-muted">
                        {invite.code} · Sent {invite.sentAgo}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancel(invite)}
                    className="shrink-0 text-ink-muted transition-colors hover:text-red-600"
                    aria-label={`Cancel invite for ${invite.name}`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {isExpanded && (
                  <div className="mt-4 border-t border-[#d3c3ba]/20 pt-4">
                    <InviteLinkCopy url={buildInviteJoinUrl(invite.code)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => showToast("Invite history coming soon")}
        className="mt-5 w-full rounded-lg border border-[#d3c3ba]/30 py-3 text-sm font-medium text-ink-muted transition-colors hover:bg-background"
      >
        View All History
      </button>
    </section>
  );
}
