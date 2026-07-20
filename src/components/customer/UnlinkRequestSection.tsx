"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Badge } from "@/components/ui/Badge";
import {
  canCustomerRequestUnlink,
  getMarketplaceBlockReason,
  isLinkedCustomer,
} from "@/lib/customer-access";
import { Link2, Shield, Info } from "lucide-react";

const statusLabels = {
  pending: "Pending admin review",
  designer_review: "Awaiting designer confirmation",
  approved: "Approved — you are unlinked",
  declined: "Declined",
  none: "",
};

export function UnlinkRequestSection() {
  const { customerLink, submitUnlinkRequest, canAccessMarketplace } = useApp();
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);

  if (!isLinkedCustomer(customerLink) && customerLink.unlinkStatus !== "approved") {
    return null;
  }

  const canSubmit = canCustomerRequestUnlink(customerLink);
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

        {canSubmit && (
          <>
            {!showForm ? (
              <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
                Request to unlink from designer
              </Button>
            ) : (
              <div className="space-y-4 border-t border-primary/10 pt-4">
                <div className="flex gap-2 text-xs text-primary/60">
                  <Shield className="h-4 w-4 shrink-0 text-accent" />
                  <p>
                    Your request goes to admin with your reason. Admin will confirm with{" "}
                    {customerLink.linkedDesignerName} before approving or declining.
                  </p>
                </div>
                <TextArea
                  label="Reason for unlinking"
                  id="unlink-reason"
                  placeholder="Explain why you'd like to unlink (e.g. relocating, project complete, seeking new designer)..."
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
                    Send to admin
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
