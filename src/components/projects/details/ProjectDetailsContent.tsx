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

function formatRecordDate(value?: string | null) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function RecordField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-xl border border-primary/8 bg-background/60 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/45">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-primary">{value || "Not recorded"}</p>
    </div>
  );
}

function AdminProjectSupportRecord({
  project,
  backHref,
  backLabel,
}: {
  project: Project;
  backHref: string;
  backLabel: string;
}) {
  const recordState = project.relationshipArchivedAt
    ? "Archived relationship"
    : getProjectStatusLabel(project.status);
  const items = project.items ?? [];
  const referenceCount =
    (project.referenceImages?.length ?? 0) + (project.customerReferences?.length ?? 0);
  const hasMeasurements = project.measurements && Object.keys(project.measurements).length > 0;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-8 pt-6 lg:px-16 lg:pb-10 lg:pt-8">
      <DesktopBackNav href={backHref} label={backLabel} />

      <div className="rounded-2xl border border-primary/10 bg-surface-container p-6 shadow-sm lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusPill status={project.status} />
              <span className="rounded-full border border-primary/10 bg-background px-3 py-1 text-xs font-semibold text-primary/60">
                Admin support record
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Read-only audit view
            </p>
            <h1 className="mt-3 font-headline text-2xl font-bold text-primary lg:text-4xl">
              {project.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-primary/65 lg:text-base">
              This is an internal project record for support, moderation and audit. Admin does not
              use the live client/designer production workspace, so timeline controls, delivery
              tools and normal messaging actions are hidden here.
            </p>
          </div>
          <div className="rounded-xl border border-primary/10 bg-background/60 px-4 py-3 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/45">
              Project code
            </p>
            <p className="mt-1 text-sm font-semibold text-primary">{project.projectCode}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <RecordField label="Record state" value={recordState} />
        <RecordField label="Client" value={project.customerName} />
        <RecordField label="Designer" value={project.designerName ?? "Unknown designer"} />
        <RecordField label="Outfit type" value={project.outfitType} />
        <RecordField label="Budget" value={project.budget} />
        <RecordField label="Deadline" value={formatRecordDate(project.deadline)} />
        <RecordField label="Started" value={formatRecordDate(project.createdAt ?? project.startedDate)} />
        <RecordField label="Last updated" value={formatRecordDate(project.updatedAt ?? project.lastUpdated)} />
        <RecordField
          label="Relationship archived"
          value={formatRecordDate(project.relationshipArchivedAt)}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-12">
        <section className="rounded-2xl border border-primary/10 bg-card p-5 shadow-sm lg:col-span-7">
          <h2 className="font-headline text-lg font-semibold text-primary">Project record</h2>
          <p className="mt-1 text-sm text-primary/60">
            Retained details for support, moderation and dispute review.
          </p>

          <div className="mt-5 space-y-3">
            {items.length > 0 ? (
              items.map((item) => (
                <div key={item.id} className="rounded-xl border border-primary/8 bg-background/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-primary">{item.title}</p>
                      <p className="mt-1 text-sm text-primary/55">
                        {item.outfitType} · Due {formatRecordDate(item.deadline)}
                        {item.price ? ` · ${item.price}` : ""}
                      </p>
                    </div>
                    <StatusPill status={item.status} />
                  </div>
                  {item.description && (
                    <p className="mt-3 text-sm leading-relaxed text-primary/70">{item.description}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-primary/8 bg-background/60 p-4 text-sm text-primary/55">
                No clothing items were recorded for this project.
              </p>
            )}
          </div>
        </section>

        <aside className="space-y-5 lg:col-span-5">
          <section className="rounded-2xl border border-primary/10 bg-card p-5 shadow-sm">
            <h2 className="font-headline text-lg font-semibold text-primary">Support summary</h2>
            <div className="mt-4 grid gap-3">
              <RecordField label="Reference files" value={referenceCount} />
              <RecordField label="Measurements" value={hasMeasurements ? "Recorded" : "Not recorded"} />
              <RecordField
                label="Conversation state"
                value={project.relationshipArchivedAt ? "Archived read-only" : "Internal read-only"}
              />
            </div>
          </section>

          {project.internalNotes && (
            <section className="rounded-2xl border border-primary/10 bg-card p-5 shadow-sm">
              <h2 className="font-headline text-lg font-semibold text-primary">Internal notes</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-primary/70">
                {project.internalNotes}
              </p>
            </section>
          )}
        </aside>
      </div>

      {project.description && (
        <section className="mt-6 rounded-2xl border border-primary/10 bg-card p-5 shadow-sm">
          <h2 className="font-headline text-lg font-semibold text-primary">Creative brief</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-primary/70">
            {project.description}
          </p>
        </section>
      )}
    </div>
  );
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

  if (isAdmin) {
    return (
      <AdminProjectSupportRecord
        project={project}
        backHref={backHref}
        backLabel={backLabel}
      />
    );
  }

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
