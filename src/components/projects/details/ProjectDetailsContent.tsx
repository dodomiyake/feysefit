"use client";

import { DesktopBackNav } from "@/components/ui/BackButton";
import { ProjectDetailsHero } from "@/components/projects/details/ProjectDetailsHero";
import { ProductionTimeline } from "@/components/projects/details/ProductionTimeline";
import { ProjectReferenceGallery } from "@/components/projects/details/ProjectReferenceGallery";
import { ProjectOverviewCard } from "@/components/projects/details/ProjectOverviewCard";
import { ProjectFabricCard } from "@/components/projects/details/ProjectFabricCard";
import { ProjectMeasurementsCard } from "@/components/projects/details/ProjectMeasurementsCard";
import { ProjectDeliveryCard } from "@/components/projects/details/ProjectDeliveryCard";
import { ProjectTeamCard } from "@/components/projects/details/ProjectTeamCard";
import { ProjectInternalNotesCard } from "@/components/projects/details/ProjectInternalNotesCard";
import { ProjectDetailsFooter } from "@/components/projects/details/ProjectDetailsFooter";
import { ProjectCustomerReferencesSection } from "@/components/projects/details/ProjectCustomerReferencesSection";
import { ProjectDeliveryConfirmationCard } from "@/components/projects/details/ProjectDeliveryConfirmationCard";
import { ProjectCompletionPromptCard } from "@/components/projects/details/ProjectCompletionPromptCard";
import { ProjectDeliveryIssuePanel } from "@/components/projects/details/ProjectDeliveryIssuePanel";
import { ProjectLocalOpsCards } from "@/components/projects/details/ProjectLocalOpsCards";
import { ProjectLocalOpsSummary } from "@/components/projects/details/ProjectLocalOpsSummary";
import { ProjectItemsCard } from "@/components/projects/details/ProjectItemsCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { hasVisibleLocalOps } from "@/lib/local-customer";
import {
  hasProjectDescription,
  ProjectDescriptionCard,
} from "@/components/projects/details/ProjectDescriptionCard";
import { resolveProjectDetails } from "@/lib/project-details";
import { getProjectStatusLabel, isClosedProject } from "@/lib/project-delivery";
import type { Project } from "@/lib/mock-data";

interface ProjectDetailsContentProps {
  project: Project;
  isDesigner: boolean;
  isCustomer?: boolean;
  isAdmin?: boolean;
  backHref?: string;
  backLabel?: string;
}

function ClosedProjectClearedState({
  project,
  backHref,
  backLabel,
}: {
  project: Project;
  backHref: string;
  backLabel: string;
}) {
  const statusLabel = getProjectStatusLabel(project.status).toLowerCase();

  return (
    <div className="mx-auto max-w-4xl px-5 pb-8 pt-6 lg:px-16 lg:pb-10 lg:pt-8">
      <DesktopBackNav href={backHref} label={backLabel} />
      <div className="rounded-2xl border border-primary/10 bg-surface-container p-8 text-center shadow-sm lg:p-12">
        <div className="mb-4 flex justify-center">
          <StatusPill status={project.status} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
          Project cleared
        </p>
        <h1 className="mt-3 font-headline text-2xl font-bold text-primary lg:text-4xl">
          This project is {statusLabel}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-primary/65 lg:text-base">
          {project.title} is no longer an active commission. The production workspace,
          timeline, delivery tools, messages, measurements and progress actions have been cleared
          from the live project view for both client and designer.
        </p>
        <p className="mt-5 text-xs text-primary/45">
          Project code: {project.projectCode}
        </p>
      </div>
    </div>
  );
}

export function ProjectDetailsContent({
  project,
  isDesigner,
  isCustomer = false,
  isAdmin = false,
  backHref = "/projects",
  backLabel = "Back to projects",
}: ProjectDetailsContentProps) {
  const details = resolveProjectDetails(project);
  const canViewDesignerSections = isDesigner || isAdmin;
  const canManageProject = isDesigner;
  const hasReferences = (project.customerReferences?.length ?? 0) > 0;
  const hasTeam = details.teamMembers.length > 0;

  if (!isAdmin && isClosedProject(project.status)) {
    return (
      <ClosedProjectClearedState
        project={project}
        backHref={backHref}
        backLabel={backLabel}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-8 pt-6 lg:px-16 lg:pb-10 lg:pt-8">
      <DesktopBackNav href={backHref} label={backLabel} />

      {isAdmin && (
        <p className="mb-4 rounded-lg border border-primary/10 bg-surface-container px-4 py-2.5 text-sm text-primary/70">
          Admin read-only view — internal notes and production details for support and moderation.
        </p>
      )}

      <ProjectDetailsHero
        project={project}
        isDesigner={isDesigner}
        isAdmin={isAdmin}
        canManageProject={canManageProject}
      />

      <ProductionTimeline
        project={project}
        details={details}
        isDesigner={canManageProject}
      />

      <ProjectItemsCard
        project={project}
        isDesigner={canManageProject}
        isCustomer={isCustomer}
      />

      {isCustomer && <ProjectDeliveryConfirmationCard project={project} />}
      {isCustomer && <ProjectCompletionPromptCard project={project} />}
      {canManageProject && <ProjectDeliveryIssuePanel project={project} />}

      {hasProjectDescription(project) && (
        <div className="mb-6 lg:mb-8">
          <ProjectDescriptionCard description={project.description!} />
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-5 lg:col-span-8">
          <ProjectReferenceGallery
            images={details.galleryImages}
            uploadHref={
              isCustomer ? `/projects/${project.id}/references` : undefined
            }
          />
          <ProjectFabricCard
            project={project}
            isCustomer={isCustomer}
            isDesigner={isDesigner}
            isAdmin={isAdmin}
          />
          {(isCustomer || isAdmin) && hasVisibleLocalOps(project) && (
            <ProjectLocalOpsSummary project={project} />
          )}
          {canViewDesignerSections && hasReferences && (
            <ProjectCustomerReferencesSection project={project} />
          )}
          {canManageProject && <ProjectLocalOpsCards project={project} />}
          {canViewDesignerSections && <ProjectInternalNotesCard notes={project.internalNotes} />}
        </div>

        <aside className="space-y-5 lg:col-span-4">
          <ProjectOverviewCard project={project} details={details} variant="sidebar" />
          <ProjectMeasurementsCard project={project} details={details} />
          <ProjectDeliveryCard
            project={project}
            canEdit={canManageProject}
            variant="sidebar"
          />
          {canViewDesignerSections && hasTeam && <ProjectTeamCard details={details} />}
        </aside>
      </div>

      <ProjectDetailsFooter details={details} />
    </div>
  );
}
