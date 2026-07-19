"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { Project } from "@/lib/mock-data";
import {
  deliveryIssueTypes,
  getProjectStatusLabel,
  isAwaitingDeliveryConfirmation,
  REDELIVERED_STATUS,
  type DeliveryIssueType,
} from "@/lib/project-delivery";

interface ProjectDeliveryConfirmationCardProps {
  project: Project;
}

export function ProjectDeliveryConfirmationCard({ project }: ProjectDeliveryConfirmationCardProps) {
  const { authUser, confirmProjectDelivery, reportProjectDeliveryIssue, showToast } = useApp();
  const [mode, setMode] = useState<"choose" | "issue">("choose");
  const [issueType, setIssueType] = useState<DeliveryIssueType>("fitting_problem");
  const [issueDetail, setIssueDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isAwaitingDeliveryConfirmation(project.status)) return null;

  const isRedelivery = project.status === REDELIVERED_STATUS;

  async function handleConfirmOk() {
    if (!authUser?.customerId) return;
    setSubmitting(true);
    try {
      await confirmProjectDelivery(project.id);
      showToast("Thank you — your project is marked complete.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not confirm delivery", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReportIssue(event: React.FormEvent) {
    event.preventDefault();
    if (!authUser?.customerId) return;
    if (!issueDetail.trim()) {
      showToast("Please describe the issue so your designer can help.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await reportProjectDeliveryIssue({
        projectId: project.id,
        issueType,
        detail: issueDetail,
      });
      showToast("Your concern was sent to your designer.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not report issue", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-accent/30 bg-accent/5 p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">Confirm receipt</p>
      <h2 className="mt-1 font-headline text-lg font-semibold text-primary">
        {isRedelivery ? "Your outfit has been redelivered" : "Your outfit has been delivered"}
      </h2>
      <p className="mt-2 text-sm text-primary/70">
        Status: <span className="font-medium">{getProjectStatusLabel(project.status)}</span>. Please
        confirm that you received <span className="font-medium">{project.title}</span>
        {isRedelivery
          ? " after the adjustments and that everything looks right."
          : " and that everything looks right."}
      </p>

      {mode === "choose" ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleConfirmOk()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            Everything is okay
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setMode("issue")}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-primary/20 bg-background px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-60"
          >
            <AlertTriangle className="h-4 w-4" />
            I have an issue
          </button>
        </div>
      ) : (
        <form onSubmit={handleReportIssue} className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-primary">What went wrong?</span>
            <select
              value={issueType}
              onChange={(event) => setIssueType(event.target.value as DeliveryIssueType)}
              className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
            >
              {deliveryIssueTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-primary">Describe the issue</span>
            <textarea
              value={issueDetail}
              onChange={(event) => setIssueDetail(event.target.value)}
              rows={4}
              required
              placeholder="Share what needs to be fixed — fitting, fabric, damage, delivery, etc."
              className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="rounded-full border border-primary/20 px-5 py-2.5 text-sm font-medium text-primary"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Report issue to designer"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
