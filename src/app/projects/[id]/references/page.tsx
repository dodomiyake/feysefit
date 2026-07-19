"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { DesktopBackNav } from "@/components/ui/BackButton";
import { CustomerStyleReferences } from "@/components/customer/CustomerStyleReferences";
import { useApp } from "@/context/AppContext";
import { useDashboardHref } from "@/lib/use-dashboard-href";

export default function ProjectReferencesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { projects, role, hydrated, projectsReady, syncProjects } = useApp();
  const project = projects.find((p) => p.id === id);
  const isDesigner = role === "designer";
  const dashboardHref = useDashboardHref();

  useEffect(() => {
    syncProjects();
  }, [syncProjects]);

  const isCustomer = role === "customer";
  const listBackHref = isCustomer ? dashboardHref : "/projects";
  const listBackLabel = isCustomer ? "Back to dashboard" : "Back to projects";

  if (!hydrated || !projectsReady) {
    return (
      <AppShell mobileTitle="Style References" showMobileTopBar mobileBackHref={listBackHref}>
        <div className="mx-auto max-w-7xl px-5 py-16 text-center">
          <p className="text-sm text-primary/60">Loading project…</p>
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell mobileTitle="Style References" showMobileTopBar mobileBackHref={listBackHref}>
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

  const backHref = role === "customer" ? dashboardHref : `/projects/${project.id}`;
  const backLabel = role === "customer" ? "Back to dashboard" : "Back to project";

  return (
    <AppShell
      mobileTitle="Style References"
      showMobileTopBar
      mobileBackHref={backHref}
    >
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-6 lg:px-16 lg:pb-12 lg:pt-8">
        <DesktopBackNav href={backHref} label={backLabel} />

        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {project.projectCode}
          </p>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary lg:text-4xl">
            Share Your Vision
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted lg:text-base">
            Upload pictures of styles you love or fabrics you want — your designer uses these to
            understand your taste before fittings and sourcing.
          </p>
          {role === "designer" && (
            <p className="mt-4 text-sm text-ink-muted">
              Viewing references for{" "}
              <Link href={`/projects/${project.id}`} className="font-medium text-accent hover:underline">
                {project.title}
              </Link>
            </p>
          )}
        </header>

        <CustomerStyleReferences project={project} readOnly={isDesigner} />
      </div>
    </AppShell>
  );
}
