import Link from "next/link";
import { StatusPill } from "./StatusPill";
import { PaletteSwatches } from "./PaletteSwatches";
import type { Project } from "@/lib/mock-data";
import { getProjectPalette } from "@/lib/project-palettes";
import { Calendar, User } from "lucide-react";

export function ProjectCard({ project, href }: { project: Project; href?: string }) {
  const palette = getProjectPalette(project.paletteId);

  const content = (
    <div className="rounded-xl border border-primary/8 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] text-primary/40">{project.projectCode}</p>
          <h3 className="font-headline text-lg font-semibold text-primary truncate">{project.title}</h3>
          <p className="mt-1 text-sm text-primary/60">{project.outfitType}</p>
        </div>
        <StatusPill status={project.status} />
      </div>
      {palette && (
        <div className="mt-3">
          <PaletteSwatches colors={[...palette.colors]} size="sm" />
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-primary/60">
        <span className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          {project.customerName}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {project.deadline}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium text-accent">{project.budget}</p>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
