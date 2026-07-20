"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Badge } from "@/components/ui/Badge";
import { AlertTriangle, Check, Inbox, MessageSquare, Unlink } from "lucide-react";

export function DesignerUnlinkConfirmations() {
  const { getDesignerPendingConfirmations, designerRespondToUnlink } = useApp();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pending = getDesignerPendingConfirmations();

  return (
        <section id="unlink-requests" className="mb-8 scroll-mt-24">
      <div className="flex items-center gap-2 mb-2">
        <Unlink className="h-5 w-5 text-accent" />
        <h2 className="font-headline text-lg font-semibold text-primary">
          Admin unlink confirmations
        </h2>
        {pending.length > 0 && <Badge variant="gold">{pending.length} action needed</Badge>}
      </div>
      <p className="mb-4 text-sm text-primary/60">
        When a customer asks to unlink, admin will send you their reason and ask you to confirm or
        dispute before a final decision is made.
      </p>

      {pending.length === 0 ? (
        <Card padding="md" className="flex items-start gap-4 bg-background">
          <div className="rounded-full bg-card p-3">
            <Inbox className="h-5 w-5 text-primary/40" />
          </div>
          <div>
            <p className="text-sm font-medium text-primary">No pending confirmations</p>
            <p className="mt-1 text-xs text-primary/50">
              Requests appear here after admin reviews a customer unlink and sends you a confirmation
              message.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((request) => (
            <Card
              key={request.id}
              padding="md"
              className="space-y-4 border-l-4 border-accent shadow-warm"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                  Action required
                </p>
                <p className="mt-1 font-medium text-primary">{request.customerName}</p>
                <p className="text-xs text-primary/50">
                  Unlink request · Admin contacted you{" "}
                  {request.adminContactedAt ?? "recently"}
                </p>
              </div>

              <div className="rounded-lg bg-background p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary/50">
                    Client reason
                  </p>
                  <p className="mt-1 text-sm text-primary/80">{request.reason}</p>
                </div>
                {request.adminNotes ? (
                  <div className="rounded-lg border border-highlight/30 bg-highlight/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                      Message from admin
                    </p>
                    <p className="mt-2 text-sm text-primary/80 flex gap-2">
                      <MessageSquare className="h-4 w-4 shrink-0 text-accent" />
                      {request.adminNotes}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-primary/50 italic">
                    Admin has forwarded this unlink request for your confirmation.
                  </p>
                )}
              </div>

              {expandedId === request.id ? (
                <div className="space-y-3 border-t border-primary/10 pt-4">
                  <TextArea
                    label="Your response to admin (optional)"
                    id={`designer-response-${request.id}`}
                    placeholder="Add context for admin — e.g. project still in progress, mutual agreement to part ways..."
                    value={responses[request.id] ?? ""}
                    onChange={(e) =>
                      setResponses((prev) => ({ ...prev, [request.id]: e.target.value }))
                    }
                    rows={3}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="zinc"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        designerRespondToUnlink(
                          request.id,
                          true,
                          responses[request.id]?.trim() ||
                            "I confirm this client may unlink from my studio."
                        );
                        setExpandedId(null);
                      }}
                    >
                      <Check className="h-4 w-4" /> Confirm unlink
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        designerRespondToUnlink(
                          request.id,
                          false,
                          responses[request.id]?.trim() ||
                            "I do not agree to unlink at this time."
                        );
                        setExpandedId(null);
                      }}
                    >
                      <AlertTriangle className="h-4 w-4" /> Dispute request
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="zinc" size="sm" onClick={() => setExpandedId(request.id)}>
                  Respond to admin
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
