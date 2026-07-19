"use client";

import Link from "next/link";
import { use, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectDetailsContent } from "@/components/projects/details/ProjectDetailsContent";
import { useApp } from "@/context/AppContext";
import { useDashboardHref } from "@/lib/use-dashboard-href";

export default function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { projects, role, hydrated, projectsReady, syncProjects } = useApp();
  const dashboardHref = useDashboardHref();
  const project = projects.find((p) => p.id === id);
  const isAdmin = hydrated && role === "admin";
  const isDesigner = hydrated && role === "designer";
  const isCustomer = hydrated && role === "customer";
  const listBackHref = isAdmin
    ? "/dashboard/admin/projects"
    : isCustomer
      ? dashboardHref
      : "/projects";
  const listBackLabel = isAdmin
    ? "Back to admin projects"
    : isCustomer
      ? "Back to dashboard"
      : "Back to projects";

  useEffect(() => {
    syncProjects();
  }, [syncProjects]);

  if (!hydrated || !projectsReady) {
    return (
      <AppShell mobileTitle="Project Details" showMobileTopBar mobileBackHref={listBackHref}>
        <div className="mx-auto max-w-7xl px-5 py-16 text-center">
          <p className="text-sm text-primary/60">Loading project…</p>
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell mobileTitle="Project Details" showMobileTopBar mobileBackHref={listBackHref}>
        <div className="mx-auto max-w-lg px-5 py-16 text-center">
          <h1 className="font-headline text-2xl font-bold text-primary">Project not found</h1>
          <p className="mt-3 text-sm text-primary/60">
            This project does not exist or you may not have access to it.
          </p>
          <Link
            href={listBackHref}
            className="mt-6 inline-block text-sm font-medium text-accent hover:underline"
          >
            {listBackLabel}
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      mobileTitle="Project Details"
      showMobileTopBar
      mobileBackHref={listBackHref}
    >
      <ProjectDetailsContent
        project={project}
        isDesigner={isDesigner}
        isCustomer={isCustomer}
        isAdmin={isAdmin}
        backHref={listBackHref}
        backLabel={listBackLabel}
      />
    </AppShell>
  );
}
