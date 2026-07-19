"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { projectOutfitTypes } from "@/lib/project-outfit-types";
import type { Project } from "@/lib/mock-data";
import { getTestimonialForProject } from "@/lib/testimonials";
import { isProjectCompleted } from "@/lib/project-delivery";

interface ProjectTestimonialCardProps {
  project: Project;
}

function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const star = index + 1;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="rounded p-0.5 transition-colors hover:bg-primary/5"
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
          >
            <Star
              className={`h-6 w-6 ${
                star <= value ? "fill-accent text-accent" : "text-primary/25"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

export function ProjectTestimonialCard({ project }: ProjectTestimonialCardProps) {
  const { authUser, customers, testimonials, submitTestimonial, showToast, refreshAppData } =
    useApp();
  const existing = getTestimonialForProject(testimonials, project.id);
  const customer = customers.find((entry) => entry.id === project.customerId);

  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [outfitType, setOutfitType] = useState(project.outfitType || "");
  const [allowPublic, setAllowPublic] = useState(true);
  const [showName, setShowName] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [privateFeedback, setPrivateFeedback] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const firstName = useMemo(() => {
    const name = customer?.name ?? project.customerName ?? authUser?.name ?? "Client";
    return name.split(" ")[0] || name;
  }, [authUser?.name, customer?.name, project.customerName]);

  if (!isProjectCompleted(project.status)) return null;

  if (existing) {
    return (
      <section className="mb-6 rounded-xl border border-primary/10 bg-surface-container p-6">
        <h2 className="font-headline text-lg font-semibold text-primary">Your testimonial</h2>
        <p className="mt-1 text-sm text-primary/60">
          Thank you for sharing feedback about this completed project.
        </p>
        <div className="mt-4 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={`h-4 w-4 ${
                index < existing.rating ? "fill-accent text-accent" : "text-primary/20"
              }`}
            />
          ))}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-primary/80">&ldquo;{existing.body}&rdquo;</p>
        {existing.photoUrl && (
          <div className="relative mt-4 h-40 w-full max-w-xs overflow-hidden rounded-lg">
            <Image src={existing.photoUrl} alt="Project outfit" fill className="object-cover" unoptimized />
          </div>
        )}
        <p className="mt-3 text-xs text-primary/50">
          {existing.allowPublic
            ? "Shared publicly on your designer's marketplace profile."
            : "Kept private — only your designer can see this review."}
        </p>
      </section>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!authUser?.customerId || !project.designerId) return;
    if (!body.trim()) {
      showToast("Please write your testimonial.", "error");
      return;
    }
    if (!rating) {
      showToast("Please select a star rating.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await submitTestimonial({
        projectId: project.id,
        rating,
        body,
        outfitType: outfitType || project.outfitType,
        allowPublic,
        showName,
        showLocation,
        privateFeedback,
        customerFirstName: firstName,
        customerLocation: customer?.location,
        photoFile,
        designerLegacyId: project.designerId,
      });
      await refreshAppData();
      showToast("Thank you — your testimonial was submitted.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not submit testimonial", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-accent/25 bg-surface-container p-6 shadow-sm ring-1 ring-accent/10">
      <h2 className="font-headline text-lg font-semibold text-primary">Share your experience</h2>
      <p className="mt-1 text-sm text-primary/60">
        Your project is complete. Leave a testimonial for {project.designerName ?? "your designer"}.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block text-sm">
          <span className="mb-2 block font-medium text-primary">Star rating</span>
          <StarRatingInput value={rating} onChange={setRating} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-primary">Written testimonial</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            required
            placeholder="Describe the craftsmanship, communication, and how the final piece turned out..."
            className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-primary">Outfit type</span>
          <select
            value={outfitType}
            onChange={(event) => setOutfitType(event.target.value)}
            className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
          >
            {projectOutfitTypes.map((option) => (
              <option key={option.value || "default"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-primary">Optional project photo</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-primary/70 file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-primary">Private feedback to designer (optional)</span>
          <textarea
            value={privateFeedback}
            onChange={(event) => setPrivateFeedback(event.target.value)}
            rows={3}
            placeholder="Anything you'd like to share privately — not shown on the marketplace."
            className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
          />
        </label>

        <div className="space-y-2 rounded-lg border border-primary/10 bg-background/60 p-4 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={allowPublic}
              onChange={(event) => setAllowPublic(event.target.checked)}
              className="mt-1"
            />
            <span>Allow this testimonial to appear on the designer&apos;s public marketplace profile</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={showName}
              onChange={(event) => setShowName(event.target.checked)}
              className="mt-1"
            />
            <span>Show my first name publicly (otherwise initials only)</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={showLocation}
              onChange={(event) => setShowLocation(event.target.checked)}
              className="mt-1"
            />
            <span>Show my general location publicly (city or country only)</span>
          </label>
          <p className="text-xs text-primary/50">
            We never publish email, phone, address, or private project details.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit testimonial"}
        </button>
      </form>
    </section>
  );
}
