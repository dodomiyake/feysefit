"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CustomerProjectTimeline } from "@/components/customer/CustomerProjectTimeline";
import { CustomerRecentUpdates } from "@/components/customer/CustomerRecentUpdates";
import { CustomerDesignerMessage } from "@/components/customer/CustomerDesignerMessage";
import { CustomerDesignerPanel } from "@/components/customer/CustomerDesignerPanel";
import { CustomerSpecifications } from "@/components/customer/CustomerSpecifications";
import { CustomerProjectItemsPreview } from "@/components/customer/CustomerProjectItemsPreview";
import { CustomerReferencesPreview } from "@/components/customer/CustomerReferencesPreview";
import { MarketplaceLinkBanner } from "@/components/customer/MarketplaceLinkBanner";
import { DirectCustomerHome } from "@/components/customer/DirectCustomerHome";
import { EmptyState } from "@/components/ui/EmptyState";
import { isDirectCustomer, isLinkedCustomer } from "@/lib/customer-access";
import { useApp } from "@/context/AppContext";
import { useCustomerActiveProject } from "@/lib/use-customer-project";
import { getProjectPalette } from "@/lib/project-palettes";
import { PaletteSwatches } from "@/components/ui/PaletteSwatches";
import { ProjectDeliveryConfirmationCard } from "@/components/projects/details/ProjectDeliveryConfirmationCard";
import { ProjectCompletionPromptCard } from "@/components/projects/details/ProjectCompletionPromptCard";
import {
  getProjectStatusLabel,
  isAwaitingDeliveryConfirmation,
  isPostDeliveryStatus,
  isProjectCompleted,
  REDELIVERED_STATUS,
} from "@/lib/project-delivery";
import { getDesignerById as fetchDesignerById } from "@/lib/services/designerService";
import type { Designer } from "@/lib/mock-data";
import { Ruler, Upload, FolderOpen, ExternalLink } from "lucide-react";

export default function CustomerDashboardClient() {
  const { authUser, customerLink, canAccessMarketplace, syncProjects, getDesignerById } = useApp();
  const activeProject = useCustomerActiveProject();
  const awaitingConfirmation = activeProject
    ? isAwaitingDeliveryConfirmation(activeProject.status)
    : false;
  const isRedelivery = activeProject?.status === REDELIVERED_STATUS;
  const isCompleted = activeProject ? isProjectCompleted(activeProject.status) : false;
  const isPostDelivery = activeProject ? isPostDeliveryStatus(activeProject.status) : false;
  const linkedId = customerLink.linkedDesignerId;
  const fromContext = linkedId ? getDesignerById(linkedId) : undefined;
  const [designer, setDesigner] = useState<Designer | undefined>(fromContext);
  const hasProject = Boolean(activeProject);
  const showDirectHome = isDirectCustomer(customerLink) && !customerLink.linkedDesignerId;
  const palette = activeProject ? getProjectPalette(activeProject.paletteId) : null;
  const firstName = authUser?.name?.split(" ")[0] ?? "there";

  useEffect(() => {
    void syncProjects();
  }, [syncProjects]);

  useEffect(() => {
    if (fromContext) {
      setDesigner(fromContext);
      return;
    }
    if (!linkedId) {
      setDesigner(undefined);
      return;
    }
    let cancelled = false;
    void fetchDesignerById(linkedId)
      .then((loaded) => {
        if (!cancelled) setDesigner(loaded ?? undefined);
      })
      .catch(() => {
        if (!cancelled) setDesigner(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [fromContext, linkedId]);

  return (
    <AppShell mobileTitle="My Dashboard" showMobileTopBar>
      <div className="mx-auto max-w-7xl flex-1 px-5 pb-10 pt-6 lg:px-16 lg:pb-12">
        <div className="mb-6 lg:hidden">
          <h1 className="font-headline text-2xl font-bold text-primary">Welcome back, {firstName}</h1>
          <p className="mt-2 text-sm leading-relaxed text-primary/60">
            {activeProject
              ? awaitingConfirmation
                ? isRedelivery
                  ? `${activeProject.title} has been redelivered — please confirm receipt when you're ready.`
                  : `${activeProject.title} has been delivered — please confirm receipt when you're ready.`
                : isCompleted
                  ? `Your ${activeProject.title} is complete. Share feedback and order again anytime.`
                  : isPostDelivery
                    ? `Your designer is following up on your delivery concern for ${activeProject.title}.`
                    : `Your bespoke journey is progressing beautifully. Your designer is currently finalizing the details of your ${activeProject.title}.`
              : "Your bespoke journey starts here. Link with your designer to see project updates."}
          </p>
        </div>

        {!canAccessMarketplace && isLinkedCustomer(customerLink) && <MarketplaceLinkBanner />}

        {showDirectHome ? (
          <DirectCustomerHome />
        ) : activeProject && customerLink.linkedDesignerId && designer ? (
          <>
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
                  Current Commission · {activeProject.projectCode}
                </p>
                <h2 className="font-headline text-2xl font-bold text-primary lg:text-3xl">
                  {activeProject.title}
                </h2>
                <p className="mt-1 text-sm text-primary/55 lg:hidden">
                  {activeProject.outfitType} · {getProjectStatusLabel(activeProject.status)}
                </p>
                {palette && (
                  <div className="mt-4">
                    <PaletteSwatches colors={[...palette.colors]} labels={[...palette.labels]} size="sm" />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {isPostDelivery ? (
                  <Link
                    href={`/projects/${activeProject.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View project
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/measurements"
                      className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-5 py-2 text-sm font-medium text-primary transition-colors hover:bg-zinc-900 hover:text-white"
                    >
                      <Ruler className="h-4 w-4" />
                      Submit Measurements
                    </Link>
                    <Link
                      href={`/projects/${activeProject.id}/references`}
                      className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Inspiration
                    </Link>
                  </>
                )}
              </div>
            </div>

            {awaitingConfirmation && <ProjectDeliveryConfirmationCard project={activeProject} />}
            {isCompleted && <ProjectCompletionPromptCard project={activeProject} />}

            <CustomerProjectTimeline
              key={`${activeProject.id}-${activeProject.status}`}
              projectId={activeProject.id}
            />

            <CustomerProjectItemsPreview project={activeProject} />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="space-y-8 lg:col-span-8">
                <CustomerRecentUpdates
                  project={activeProject}
                  portfolioImages={designer.portfolioImages}
                />
                <CustomerDesignerMessage designer={designer} project={activeProject} />
              </div>
              <div className="space-y-6 lg:col-span-4">
                <CustomerDesignerPanel designer={designer} />
                <CustomerSpecifications project={activeProject} />
                <CustomerReferencesPreview project={activeProject} />
              </div>
            </div>
          </>
        ) : hasProject && activeProject ? (
          <>
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
                  {customerLink.linkedDesignerId ? "Current Commission" : "Past Commission"} ·{" "}
                  {activeProject.projectCode}
                </p>
                <h2 className="font-headline text-2xl font-bold text-primary lg:text-3xl">
                  {activeProject.title}
                </h2>
                {!customerLink.linkedDesignerId && (
                  <p className="mt-2 text-sm text-primary/60">
                    You are unlinked from your designer. Project history and archived messages
                    remain available read-only.
                  </p>
                )}
              </div>
            </div>

            <CustomerProjectTimeline
              key={`${activeProject.id}-${activeProject.status}`}
              projectId={activeProject.id}
            />

            <CustomerProjectItemsPreview project={activeProject} />

            <div className="mt-6">
              <Link
                href={`/projects/${activeProject.id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View project history
              </Link>
            </div>
          </>
        ) : isLinkedCustomer(customerLink) && designer ? (
          <EmptyState
            icon={FolderOpen}
            title="No active project"
            description="Once your designer creates a project for you, you'll see progress and updates here."
          />
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="No active project"
            description="Once your designer creates a project for you, you'll see progress and updates here."
          />
        )}
      </div>

      <SiteFooter />
    </AppShell>
  );
}
