import type { Project } from "@/lib/mock-data";

interface ProjectDescriptionCardProps {
  description: string;
}

export function ProjectDescriptionCard({ description }: ProjectDescriptionCardProps) {
  if (!description.trim()) return null;

  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-5 shadow-warm">
      <h3 className="font-headline text-lg font-semibold text-primary">Creative brief</h3>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-primary/80">
        {description}
      </p>
    </section>
  );
}

export function hasProjectDescription(project: Pick<Project, "description">): boolean {
  return Boolean(project.description?.trim());
}
