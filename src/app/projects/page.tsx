"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { DesktopBackNav } from "@/components/ui/BackButton";
import { ProjectsListTable } from "@/components/projects/ProjectsListTable";
import { NewProjectButton } from "@/components/ui/NewProjectButton";
import { useApp } from "@/context/AppContext";
import { useDashboardHref } from "@/lib/use-dashboard-href";
import { useCustomerActiveProject } from "@/lib/use-customer-project";

export default function ProjectsListPage() {
  const router = useRouter();
  const { role, hydrated, projectsReady, syncProjects } = useApp();
  const dashboardHref = useDashboardHref();
  const activeProject = useCustomerActiveProject();
  const isCustomer = role === "customer";

  useEffect(() => {
    if (isCustomer) {
      void syncProjects();
    }
  }, [isCustomer, syncProjects]);

  useEffect(() => {
    if (hydrated && projectsReady && isCustomer && activeProject) {
      router.replace(`/projects/${activeProject.id}`);
    }
  }, [hydrated, projectsReady, isCustomer, activeProject, router]);

  if (isCustomer) {
    if (!hydrated || !projectsReady) {
      return (
        <AppShell mobileTitle="Projects" showMobileTopBar mobileBackHref={dashboardHref}>
          <div className="mx-auto max-w-7xl px-5 py-16 text-center">
            <p className="text-sm text-primary/60">Loading project…</p>
          </div>
        </AppShell>
      );
    }

    if (!activeProject) {
      return (
        <AppShell mobileTitle="Projects" showMobileTopBar mobileBackHref={dashboardHref}>
          <div className="mx-auto max-w-lg px-5 py-16 text-center">
            <h1 className="font-headline text-2xl font-bold text-primary">No project found</h1>
            <p className="mt-3 text-sm text-primary/60">
              Once your designer creates a project for you, you&apos;ll see it here.
            </p>
            <Link
              href={dashboardHref}
              className="mt-6 inline-block text-sm font-medium text-accent hover:underline"
            >
              Back to dashboard
            </Link>
          </div>
        </AppShell>
      );
    }

    return (
      <AppShell mobileTitle="Projects" showMobileTopBar mobileBackHref={dashboardHref}>
        <div className="mx-auto max-w-7xl px-5 py-16 text-center">
          <p className="text-sm text-primary/60">Opening your project…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar title="Projects" showBack backHref={dashboardHref} />
      <div className="mx-auto w-full max-w-none px-5 py-6 lg:px-10 lg:py-10 xl:px-12">
        <DesktopBackNav href={dashboardHref} label="Back to dashboard" />
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="font-headline text-2xl font-bold text-primary">All Projects</h1>
          <NewProjectButton />
        </div>
        <ProjectsListTable />
      </div>
    </AppShell>
  );
}
