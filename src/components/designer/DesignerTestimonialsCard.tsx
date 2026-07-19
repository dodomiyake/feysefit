"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { EyeOff, Flag, Mail, Star } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { resolveOutfitTypeLabel, type Testimonial } from "@/lib/testimonials";
import { isProjectCompleted } from "@/lib/project-delivery";

export function DesignerTestimonialsCard() {
  const {
    projects,
    testimonials,
    requestProjectTestimonial,
    hideTestimonialFromProfile,
    reportTestimonial,
    showToast,
    refreshAppData,
  } = useApp();
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetail, setReportDetail] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const completedProjects = useMemo(
    () => projects.filter((project) => isProjectCompleted(project.status)),
    [projects]
  );

  const items = useMemo(() => {
    return testimonials
      .slice()
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [testimonials]);

  async function handleRequest(projectId: string) {
    setPending(`request-${projectId}`);
    try {
      await requestProjectTestimonial(projectId);
      await refreshAppData();
      showToast("Testimonial request sent to your client.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not send request", "error");
    } finally {
      setPending(null);
    }
  }

  async function handleHide(item: Testimonial) {
    setPending(`hide-${item.id}`);
    try {
      await hideTestimonialFromProfile(item.id, item.status !== "hidden_by_designer");
      await refreshAppData();
      showToast(
        item.status === "hidden_by_designer"
          ? "Testimonial visible on your profile again."
          : "Testimonial hidden from your public profile."
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Action failed", "error");
    } finally {
      setPending(null);
    }
  }

  async function handleReport(item: Testimonial) {
    if (!reportReason.trim()) {
      showToast("Select a reason before reporting.", "error");
      return;
    }
    setPending(`report-${item.id}`);
    try {
      await reportTestimonial(item.id, reportReason, reportDetail);
      setReportingId(null);
      setReportReason("");
      setReportDetail("");
      showToast("Report sent to admin for review.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not submit report", "error");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="rounded-xl border border-primary/10 bg-card p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="font-headline text-lg font-semibold text-primary">Client testimonials</h2>
        <p className="mt-1 text-sm text-primary/60">
          Reviews from completed projects. You can request feedback or hide a review from your public
          profile. You cannot edit client testimonials.
        </p>
      </div>

      {completedProjects.length > 0 && (
        <div className="mb-6 rounded-lg border border-dashed border-primary/15 p-4">
          <p className="text-sm font-medium text-primary">Request testimonials</p>
          <ul className="mt-3 space-y-2">
            {completedProjects.map((project) => {
              const hasReview = testimonials.some((item) => item.projectId === project.id);
              return (
                <li
                  key={project.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="text-primary/75">
                    {project.title}{" "}
                    <span className="text-primary/45">· {project.customerName}</span>
                  </span>
                  {hasReview ? (
                    <span className="text-xs font-medium text-accent">Submitted</span>
                  ) : (
                    <button
                      type="button"
                      disabled={pending === `request-${project.id}`}
                      onClick={() => void handleRequest(project.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/15 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/5"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Request testimonial
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-primary/50">No testimonials received yet.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-primary/10 bg-surface-container/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${
                          index < item.rating ? "fill-accent text-accent" : "text-primary/20"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-sm font-medium text-primary">
                    {item.projectTitle ?? "Completed project"} ·{" "}
                    {resolveOutfitTypeLabel(item.outfitType)}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-primary/80">&ldquo;{item.body}&rdquo;</p>
                  {item.privateFeedback && (
                    <p className="mt-3 rounded-lg bg-background/80 px-3 py-2 text-xs text-primary/65">
                      <span className="font-semibold text-primary">Private note:</span>{" "}
                      {item.privateFeedback}
                    </p>
                  )}
                  {item.photoUrl && (
                    <div className="relative mt-3 h-32 w-44 overflow-hidden rounded-lg">
                      <Image
                        src={item.photoUrl}
                        alt="Client outfit"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.allowPublic && (
                    <button
                      type="button"
                      disabled={pending === `hide-${item.id}`}
                      onClick={() => void handleHide(item)}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/15 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      {item.status === "hidden_by_designer" ? "Show publicly" : "Hide from profile"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setReportingId(item.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/15 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    Report
                  </button>
                </div>
              </div>

              {reportingId === item.id && (
                <div className="mt-4 space-y-2 border-t border-primary/10 pt-4">
                  <select
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value)}
                    className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select a reason</option>
                    <option value="Inappropriate content">Inappropriate content</option>
                    <option value="Not a genuine client">Not a genuine client</option>
                    <option value="Misleading review">Misleading review</option>
                    <option value="Other">Other</option>
                  </select>
                  <textarea
                    value={reportDetail}
                    onChange={(event) => setReportDetail(event.target.value)}
                    rows={3}
                    placeholder="Additional context for admin review"
                    className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending === `report-${item.id}`}
                      onClick={() => void handleReport(item)}
                      className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                    >
                      Submit report
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportingId(null)}
                      className="rounded-full px-4 py-2 text-xs font-medium text-primary/60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
