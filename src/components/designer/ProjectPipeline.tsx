"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { projectStatuses, type ProjectStatus } from "@/lib/design-tokens";
import { ProjectStatusSelect } from "@/components/designer/ProjectStatusSelect";
import { cn } from "@/lib/cn";
import { formatProjectUpdatedLabel } from "@/lib/relative-time";
import { FolderKanban } from "lucide-react";
import type { Project } from "@/lib/mock-data";
import { useResolvedStorageUrl } from "@/hooks/useResolvedStorageUrl";

const tabs = ["All Projects", ...projectStatuses.slice(0, 4)] as const;

function progressForStatus(status: ProjectStatus): number {
  const index = projectStatuses.indexOf(status);
  return Math.round(((index + 1) / projectStatuses.length) * 100);
}

function projectThumbnail(project: Project) {
  if (project.referenceImages[0]) return project.referenceImages[0];
  return null;
}

function PipelineThumb({ src, alt }: { src: string; alt: string }) {
  const resolvedSrc = useResolvedStorageUrl(src);
  if (!resolvedSrc) {
    return (
      <div className="flex h-full w-full items-center justify-center text-primary/30">
        <FolderKanban className="h-6 w-6" />
      </div>
    );
  }
  return <Image src={resolvedSrc} alt={alt} fill className="object-cover" unoptimized />;
}

export function ProjectPipeline() {
  const { projects } = useApp();
  const [activeTab, setActiveTab] = useState<string>("All Projects");

  const filtered =
    activeTab === "All Projects"
      ? projects
      : projects.filter((p) => p.status === activeTab);

  return (
    <section className="rounded-xl bg-surface-container p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-lg font-semibold text-primary">Project Pipeline</h2>
          <p className="mt-1 text-xs text-primary/50">Update timeline status from each project row</p>
        </div>
        <Link href="/projects" className="text-sm font-medium text-accent hover:underline">
          View All
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab
                ? "bg-highlight/35 text-primary"
                : "text-primary/50 hover:bg-card/80 hover:text-primary"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-1">
        {filtered.map((project) => {
          const thumb = projectThumbnail(project);

          return (
            <div
              key={project.id}
              className="flex flex-wrap items-center gap-4 rounded-lg p-4 transition-colors hover:bg-card/50"
            >
              <Link href={`/projects/${project.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-card">
                  {thumb ? (
                    <PipelineThumb src={thumb} alt={project.title} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-primary/30">
                      <FolderKanban className="h-6 w-6" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-headline text-base font-semibold text-primary">
                    {project.title}
                  </h3>
                  <p className="mt-0.5 truncate text-sm text-primary/55">
                    Client: {project.customerName} · Updated {formatProjectUpdatedLabel(project)}
                  </p>
                </div>
              </Link>

              <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-primary/45 sm:text-right">
                  Timeline
                </label>
                <ProjectStatusSelect projectId={project.id} status={project.status} />
                <div className="h-1 w-full overflow-hidden rounded-full bg-primary/10 sm:w-24">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${progressForStatus(project.status)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
