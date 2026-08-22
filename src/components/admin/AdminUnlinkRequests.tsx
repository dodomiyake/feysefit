"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { Select } from "@/components/ui/Select";
import { AdminDateRangeFilter } from "@/components/admin/AdminDateRangeFilter";
import { AdminExportButton } from "@/components/admin/AdminExportButton";
import { useApp } from "@/context/AppContext";
import type { UnlinkRequest, UnlinkRequestStatus } from "@/lib/customer-access";
import { dedupeOpenUnlinkRequests } from "@/lib/customer-access";
import { getUnlinkBlockingProjects } from "@/lib/unlink-guards";
import type { DateRangeFilter } from "@/lib/admin-date-filter";
import { isDateInRange } from "@/lib/admin-date-filter";
import { MessageSquare, Check, X, Clock } from "lucide-react";

const statusBadge: Record<UnlinkRequestStatus, { label: string; variant: "default" | "gold" | "outline" }> = {
  none: { label: "", variant: "outline" },
  pending: { label: "Pending review", variant: "default" },
  designer_review: { label: "Awaiting designer", variant: "default" },
  approved: { label: "Approved", variant: "gold" },
  declined: { label: "Declined", variant: "outline" },
};

type StatusFilter = "all" | "active" | UnlinkRequestStatus;

const defaultDateRange: DateRangeFilter = { preset: "all" };

function getRequestStatusLabel(request: UnlinkRequest) {
  if (request.status === "approved" && request.adminNotes?.toLowerCase().includes("auto-approved")) {
    return "Auto-approved";
  }
  return statusBadge[request.status].label;
}

export function AdminUnlinkRequests() {
  const { unlinkRequests, adminSendDesignerConfirmation, adminApproveUnlink, adminDeclineUnlink, projects } =
    useApp();
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>(defaultDateRange);

  const filtered = useMemo(() => {
    const source =
      statusFilter === "active" || statusFilter === "pending" || statusFilter === "designer_review"
        ? dedupeOpenUnlinkRequests(unlinkRequests)
        : unlinkRequests;

    return source.filter((request) => {
      if (statusFilter === "active") {
        if (request.status === "approved" || request.status === "declined") return false;
      } else if (statusFilter !== "all" && request.status !== statusFilter) {
        return false;
      }
      if (!isDateInRange(request.submittedAt, dateRange)) return false;
      return true;
    });
  }, [unlinkRequests, statusFilter, dateRange]);

  const exportColumns = [
    { header: "Client", value: (row: UnlinkRequest) => row.customerName },
    { header: "Designer", value: (row: UnlinkRequest) => row.designerName },
    { header: "Reason", value: (row: UnlinkRequest) => row.reason },
    { header: "Status", value: (row: UnlinkRequest) => getRequestStatusLabel(row) || row.status },
    { header: "Submitted", value: (row: UnlinkRequest) => row.submittedAt },
    { header: "Designer response", value: (row: UnlinkRequest) => row.designerConfirmation ?? "" },
  ];

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-headline text-lg font-semibold text-primary">Client Unlink Requests</h2>
          <p className="mt-1 text-sm text-primary/60">
            Review active requests and keep an audit trail of instant no-project unlinks.
          </p>
        </div>
        <AdminExportButton
          filename={`feysefit-unlink-requests-${new Date().toISOString().slice(0, 10)}`}
          columns={exportColumns}
          rows={filtered}
        />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Select
          label="Status"
          options={[
            { value: "all", label: "All requests" },
            { value: "active", label: "Needs action" },
            { value: "pending", label: "Pending review" },
            { value: "designer_review", label: "Awaiting designer" },
            { value: "approved", label: "Approved / auto-approved" },
            { value: "declined", label: "Declined" },
          ]}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
        />
        <AdminDateRangeFilter value={dateRange} onChange={setDateRange} label="Submitted" />
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card padding="md">
            <p className="text-sm text-primary/60">No unlink requests match your filters.</p>
          </Card>
        ) : (
          filtered.map((request) => {
            const designerResponded =
              request.designerConfirmation === "confirmed" ||
              request.designerConfirmation === "disputed";
            const awaitingDesigner =
              request.status === "designer_review" && request.designerConfirmation === "awaiting";
            const blockingProjects = getUnlinkBlockingProjects(
              projects.filter(
                (project) =>
                  project.customerId === request.customerId &&
                  project.designerId === request.designerId
              )
            );
            const canApprove = blockingProjects.length === 0;

            return (
              <Card key={request.id} padding="md" className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-primary">{request.customerName}</p>
                    <p className="text-sm text-primary/60">
                      Wants to unlink from{" "}
                      <span className="font-medium text-primary">{request.designerName}</span>
                    </p>
                    <p className="mt-1 text-xs text-primary/40">Submitted {request.submittedAt}</p>
                  </div>
                  {request.status !== "none" && (
                    <Badge variant={statusBadge[request.status].variant}>
                      {request.designerConfirmation === "awaiting"
                        ? "Awaiting designer"
                        : getRequestStatusLabel(request)}
                    </Badge>
                  )}
                </div>

                <div className="rounded-lg bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary/50">
                    Client reason
                  </p>
                  <p className="mt-2 text-sm text-primary/80">{request.reason}</p>
                </div>

                {blockingProjects.length > 0 && request.status !== "approved" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-medium text-amber-900">
                      {blockingProjects.length} active project(s) block approval
                    </p>
                    <p className="mt-1 text-xs text-amber-800/90">
                      Complete, cancel, or move projects to Admin Support before approving unlink.
                      Messages will be archived read-only — never deleted.
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-amber-900/80">
                      {blockingProjects.map((project) => (
                        <li key={project.id}>
                          {project.title} · {project.status}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {request.status === "pending" && (
                  <>
                    <TextArea
                      label="Message to designer"
                      id={`notes-${request.id}`}
                      placeholder="Explain the situation and ask the designer to confirm whether unlink is acceptable..."
                      value={adminNotes[request.id] ?? ""}
                      onChange={(e) =>
                        setAdminNotes((prev) => ({ ...prev, [request.id]: e.target.value }))
                      }
                      rows={3}
                    />
                    <Button
                      type="button"
                      variant="zinc"
                      size="sm"
                      className="gap-2"
                      onClick={() =>
                        adminSendDesignerConfirmation(request.id, adminNotes[request.id])
                      }
                    >
                      <MessageSquare className="h-4 w-4" />
                      Send confirmation request to designer
                    </Button>
                  </>
                )}

                {request.status === "designer_review" && (
                  <div className="space-y-3">
                    {request.adminNotes && (
                      <div className="rounded-lg bg-background p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary/50">
                          Your message to designer
                        </p>
                        <p className="mt-2 text-sm text-primary/80">{request.adminNotes}</p>
                        {request.adminContactedAt && (
                          <p className="mt-1 text-xs text-primary/40">
                            Sent {request.adminContactedAt}
                          </p>
                        )}
                      </div>
                    )}

                    {awaitingDesigner && (
                      <div className="flex items-center gap-2 rounded-lg border border-highlight/30 bg-highlight/5 p-4">
                        <Clock className="h-5 w-5 shrink-0 text-accent" />
                        <p className="text-sm text-primary/70">
                          Waiting for {request.designerName} to respond. Log in as{" "}
                          <span className="font-medium">Designer</span> to confirm or dispute.
                        </p>
                      </div>
                    )}

                    {designerResponded && (
                      <div
                        className={`rounded-lg p-4 ${
                          request.designerConfirmation === "confirmed"
                            ? "border border-emerald-300/50 bg-emerald-50/80"
                            : "border border-amber-300/50 bg-amber-50/80"
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary/50">
                          Designer response
                          {request.designerRespondedAt && ` · ${request.designerRespondedAt}`}
                        </p>
                        <p className="mt-2 text-sm font-medium text-primary">
                          {request.designerConfirmation === "confirmed"
                            ? "Designer confirmed unlink"
                            : "Designer disputed unlink"}
                        </p>
                        {request.designerResponse && (
                          <p className="mt-1 text-sm text-primary/70">{request.designerResponse}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {request.status === "designer_review" && designerResponded && (
                  <div className="flex flex-wrap gap-2 border-t border-primary/10 pt-4">
                    <Button
                      type="button"
                      variant="zinc"
                      size="sm"
                      className="gap-2"
                      disabled={!canApprove}
                      onClick={() => adminApproveUnlink(request.id)}
                    >
                      <Check className="h-4 w-4" /> Approve unlink
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={() => adminDeclineUnlink(request.id, adminNotes[request.id])}
                    >
                      <X className="h-4 w-4" /> Decline
                    </Button>
                  </div>
                )}

                {request.status === "approved" && request.adminNotes?.toLowerCase().includes("auto-approved") && (
                  <p className="text-xs text-accent">
                    Client unlinked automatically because no active project was open with this designer.
                  </p>
                )}
                {request.status === "approved" && !request.adminNotes?.toLowerCase().includes("auto-approved") && (
                  <p className="text-xs text-accent">
                    Client unlinked — conversations archived read-only. Marketplace access granted.
                  </p>
                )}
                {request.status === "declined" && (
                  <p className="text-xs text-primary/50">
                    Request declined. Client remains linked until project concludes.
                  </p>
                )}
              </Card>
            );
          })
        )}
      </div>

      <p className="mt-4 text-xs text-primary/45">
        Showing {filtered.length} of {unlinkRequests.length} requests
      </p>
    </section>
  );
}
