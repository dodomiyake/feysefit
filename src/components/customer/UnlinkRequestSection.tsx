"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Badge } from "@/components/ui/Badge";
import {
  getMarketplaceBlockReason,
  isLinkedCustomer,
} from "@/lib/customer-access";
import { formatUnlinkBlockingMessage, getUnlinkBlockingProjects } from "@/lib/unlink-guards";
import { Link2, Shield, Info, AlertTriangle } from "lucide-react";

const statusLabels = {
  pending: "Pending admin review",
  designer_review: "Awaiting designer confirmation",
  approved: "Approved — you are unlinked",
  declined: "Declined",
  none: "",
};

const openUnlinkStatuses = new Set(["pending", "designer_review"]);

export function UnlinkRequestSection() {
  const {
    authUser,
    customerLink,
    submitUnlinkRequest,
    canAccessMarketplace,
    projects,
    unlinkRequests,
  } = useApp();
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);

  const blockingProjects = useMemo(() => {
    if (!customerLink.linkedDesignerId) return [];
    return getUnlinkBlockingProjects(
      projects.filter(
        (project) =>
          project.customerId &&
          (!authUser?.customerId || project.customerId === authUser.customerId) &&
          project.designerId === customerLink.linkedDesignerId
      )
    );
  }, [authUser?.customerId, customerLink.linkedDesignerId, projects]);

  const hasOpenUnlinkRequestForLinkedDesigner = useMemo(() => {
    if (!customerLink.linkedDesignerId) return false;
    return unlinkRequests.some(
      (request) =>
        openUnlinkStatuses.has(request.status) &&
        (!authUser?.customerId || request.customerId === authUser.customerId) &&
        request.designerId === customerLink.linkedDesignerId
    );
  }, [authUser?.customerId, customerLink.linkedDesignerId, unlinkRequests]);

  const hasBlockingProjects = blockingProjects.length > 0;
  const canStartUnlink = Boolean(customerLink.linkedDesignerId) && !hasBlockingProjects;

  if (!isLinkedCustomer(customerLink) && customerLink.unlinkStatus !== "approved") {
    return null;
  }

  const trulyUnlinked =
    customerLink.unlinkStatus === "approved" && !customerLink.linkedDesignerId;

  return (
    <section id="unlink" className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm lg:p-8">
      <h2 className="font-headline text-lg font-semibold text-primary">Designer Relationship</h2>
      <div className="mt-4 space-y-4">
        {customerLink.linkedDesignerId ? (
          <div className="flex items-center gap-3">
            <Link2 className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-medium text-primary">
                Linked to {customerLink.linkedDesignerName}
              </p>
              <p className="text-xs text-primary/60">Private designer–client connection</p>
            </div>
          </div>
        ) : trulyUnlinked ? (
          <p className="text-sm text-primary/70">You are no longer linked to a designer.</p>
        ) : null}

        {!canAccessMarketplace && customerLink.unlinkStatus !== "none" && (
          <div className="rounded-lg bg-highlight/10 px-4 py-3">
            <p className="text-xs font-medium text-accent">
              {customerLink.linkedDesignerId && customerLink.unlinkStatus === "approved"
                ? "Previous unlink was approved, but your designer link is still active. Request again if you still want to leave."
                : statusLabels[customerLink.unlinkStatus]}
            </p>
            {customerLink.unlinkReason && (
              <p className="mt-1 text-xs text-primary/60">Your reason: {customerLink.unlinkReason}</p>
            )}
          </div>
        )}

        {!canAccessMarketplace && (
          <div className="flex gap-2 text-xs text-primary/60">
            <Info className="h-4 w-4 shrink-0" />
            <p>{getMarketplaceBlockReason(customerLink)}</p>
          </div>
        )}

        {hasBlockingProjects && customerLink.linkedDesignerId && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Unlinking is blocked while active projects are open
                </p>
                <p className="mt-1 text-xs text-amber-800/90">
                  {formatUnlinkBlockingMessage(blockingProjects.length)} Past messages are kept
                  when you unlink — they become archived and read-only.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-amber-900/80">
                  {blockingProjects.slice(0, 4).map((project) => (
                    <li key={project.id}>
                      {project.title} · {project.status}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {canStartUnlink && (
          <>
            {hasOpenUnlinkRequestForLinkedDesigner ? (
              <div className="rounded-lg bg-highlight/10 px-4 py-3">
                <p className="text-xs font-medium text-accent">
                  Your unlink request for this designer is already in progress.
                </p>
              </div>
            ) : !showForm ? (
              <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
                End relationship
              </Button>
            ) : (
              <div className="space-y-4 border-t border-primary/10 pt-4">
                <div className="flex gap-2 text-xs text-primary/60">
                  <Shield className="h-4 w-4 shrink-0 text-accent" />
                  <p>
                    There are no active projects with {customerLink.linkedDesignerName}. This will
                    end the relationship immediately, archive previous enquiries/messages as
                    read-only, and keep any project history safely stored.
                  </p>
                </div>
                <TextArea
                  label="Reason for ending the relationship"
                  id="unlink-reason"
                  placeholder="Briefly explain why you're ending this relationship..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  required
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowForm(false);
                      setReason("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="zinc"
                    size="sm"
                    disabled={reason.trim().length < 10}
                    onClick={() => {
                      submitUnlinkRequest(reason.trim());
                      setShowForm(false);
                      setReason("");
                    }}
                  >
                    End relationship
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {trulyUnlinked && <Badge variant="gold">Marketplace access enabled</Badge>}
      </div>
    </section>
  );
}
