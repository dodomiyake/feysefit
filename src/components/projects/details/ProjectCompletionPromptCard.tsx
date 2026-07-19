"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { Project } from "@/lib/mock-data";
import { isProjectCompleted } from "@/lib/project-delivery";
import { ProjectTestimonialCard } from "@/components/projects/details/ProjectTestimonialCard";

interface ProjectCompletionPromptCardProps {
  project: Project;
}

export function ProjectCompletionPromptCard({ project }: ProjectCompletionPromptCardProps) {
  if (!isProjectCompleted(project.status)) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-accent/25 bg-accent/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Project complete</p>
        <h2 className="mt-1 font-headline text-lg font-semibold text-primary">
          Thank you for confirming your order
        </h2>
        <p className="mt-2 text-sm text-primary/70">
          We hope you love your finished piece. Share your experience, upload a final photo with your
          testimonial, and order again when you&apos;re ready.
        </p>
        {project.designerId && (
          <Link
            href={`/marketplace/${project.designerId}/request`}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <ShoppingBag className="h-4 w-4" />
            Place another order with {project.designerName ?? "this designer"}
          </Link>
        )}
      </section>

      <ProjectTestimonialCard project={project} />
    </div>
  );
}
