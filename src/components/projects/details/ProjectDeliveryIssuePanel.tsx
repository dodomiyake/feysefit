"use client";

import { useMemo, useState } from "react";
import type { Project } from "@/lib/mock-data";
import type { ProjectStatus } from "@/lib/design-tokens";
import { useApp } from "@/context/AppContext";
import {
  getDeliveryIssueLabel,
  getOpenDeliveryIssueForProject,
  getProjectStatusLabel,
} from "@/lib/project-delivery";

interface ProjectDeliveryIssuePanelProps {
  project: Project;
}

export function ProjectDeliveryIssuePanel({ project }: ProjectDeliveryIssuePanelProps) {
  const { deliveryIssues, respondToDeliveryIssue, redeliverProject, showToast } = useApp();
  const issue = useMemo(
    () => getOpenDeliveryIssueForProject(deliveryIssues, project.id),
    [deliveryIssues, project.id]
  );
  const [response, setResponse] = useState(issue?.designerResponse ?? "");
  const [editing, setEditing] = useState(!issue?.designerResponse);
  const [submitting, setSubmitting] = useState(false);
  const issueSyncKey = `${issue?.id ?? ""}:${issue?.designerResponse ?? ""}:${issue?.status ?? ""}:${issue?.updatedAt ?? ""}`;
  const [prevIssueSyncKey, setPrevIssueSyncKey] = useState(issueSyncKey);

  if (issueSyncKey !== prevIssueSyncKey) {
    setPrevIssueSyncKey(issueSyncKey);
    setResponse(issue?.designerResponse ?? "");
    setEditing(!issue?.designerResponse);
  }

  const isIssueStatus =
    project.status === "Issue Reported" || project.status === "Adjustment Needed";

  if (!isIssueStatus && !issue) return null;

  async function handleRespond(nextStatus?: ProjectStatus, markResolved?: boolean) {
    if (!issue) return;
    if (!response.trim()) {
      showToast("Add a response for your client.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await respondToDeliveryIssue({
        issueId: issue.id,
        response,
        projectStatus: nextStatus,
        markResolved,
      });
      setEditing(false);
      showToast(markResolved ? "Issue marked resolved." : "Response sent to client.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not update issue", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRedeliver() {
    setSubmitting(true);
    try {
      await redeliverProject(project.id);
      showToast("Project marked as re-delivered — awaiting client confirmation.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not redeliver", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const hasSavedResponse = Boolean(issue?.designerResponse?.trim());

  return (
    <section className="mb-6 rounded-xl border border-amber-200/60 bg-amber-50/80 p-6">
      <h2 className="font-headline text-lg font-semibold text-primary">Delivery concern</h2>
      <p className="mt-1 text-sm text-primary/65">
        Status: <span className="font-medium">{getProjectStatusLabel(project.status)}</span>
      </p>

      {issue ? (
        <div className="mt-4 space-y-3 text-sm">
          <p>
            <span className="font-medium text-primary">Issue:</span>{" "}
            {getDeliveryIssueLabel(issue.issueType)}
          </p>
          <p className="rounded-lg bg-white/70 px-3 py-2 text-primary/80">&ldquo;{issue.detail}&rdquo;</p>
        </div>
      ) : null}

      {hasSavedResponse && !editing ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-3 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-800">
            Response sent to client
          </p>
          <p className="mt-1.5 leading-relaxed text-primary/85">{issue?.designerResponse}</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-2 text-xs font-medium text-emerald-900 underline underline-offset-2"
          >
            Edit response
          </button>
        </div>
      ) : (
        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium text-primary">Your response to the client</span>
          <textarea
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            rows={4}
            placeholder="Explain next steps — alterations, refitting, redelivery, etc."
            className="w-full rounded-lg border border-primary/15 bg-white px-3 py-2 text-primary"
          />
        </label>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={submitting || !issue}
          onClick={() => void handleRespond("Adjustment Needed")}
          className="rounded-full border border-primary/20 px-4 py-2 text-sm font-medium text-primary hover:bg-white/80 disabled:opacity-60"
        >
          Send response — adjustments in progress
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleRedeliver()}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Mark redelivered — await confirmation
        </button>
        <button
          type="button"
          disabled={submitting || !issue}
          onClick={() => void handleRespond(project.status, true)}
          className="rounded-full border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-60"
        >
          Mark issue resolved
        </button>
      </div>
    </section>
  );
}
