"use client";

import Link from "next/link";
import { useState } from "react";
import { DesignerShell } from "@/components/layout/DesignerShell";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DesignerStatCards } from "@/components/designer/DesignerStatCards";
import { QuickActionGrid } from "@/components/designer/QuickActionGrid";
import { ProjectPipeline } from "@/components/designer/ProjectPipeline";
import { RecentCustomersPanel } from "@/components/designer/RecentCustomersPanel";
import { ArtisanFocusCard } from "@/components/designer/ArtisanFocusCard";
import { DesignerUnlinkConfirmations } from "@/components/designer/DesignerUnlinkConfirmations";
import { DesignerSetupChecklistCard } from "@/components/designer/DesignerSetupChecklistCard";
import { NewProjectButton } from "@/components/ui/NewProjectButton";
import { MfaEncouragementBanner } from "@/components/auth/MfaEncouragementBanner";
import { useApp } from "@/context/AppContext";
import { getTimeOfDayGreeting } from "@/lib/greeting";
import { Unlink } from "lucide-react";

export default function DesignerDashboardPage() {
  const { authUser, getDesignerById, getDesignerPendingConfirmations } = useApp();
  const pendingUnlinkCount = getDesignerPendingConfirmations().length;
  const designer = authUser?.designerId ? getDesignerById(authUser.designerId) : undefined;
  const firstName =
    designer?.designerName?.split(" ")[0] ?? authUser?.name?.split(" ")[0] ?? "there";
  const [greeting] = useState(() => getTimeOfDayGreeting());

  return (
    <DesignerShell>
      <div className="mx-auto max-w-7xl flex-1 px-5 pb-10 pt-6 lg:px-16 lg:pb-12">
        <MfaEncouragementBanner />

        <DesignerSetupChecklistCard />

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary lg:text-[1.75rem] lg:leading-tight">
              {greeting}, {firstName}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary/60 lg:text-base">
              Your atelier is bustling. Here&apos;s what requires your attention today.
            </p>
          </div>
          <NewProjectButton />
        </div>

        {pendingUnlinkCount > 0 && (
          <Link
            href="#unlink-requests"
            className="mb-6 flex items-center gap-3 rounded-2xl border border-accent/25 bg-highlight/12 px-5 py-4 text-sm text-primary transition-colors hover:bg-highlight/20 lg:hidden"
          >
            <Unlink className="h-5 w-5 shrink-0 text-accent" />
            <span>
              <span className="font-semibold text-accent">{pendingUnlinkCount} admin unlink confirmation</span>
              {pendingUnlinkCount > 1 ? "s" : ""} need your response
            </span>
          </Link>
        )}

        <DesignerUnlinkConfirmations />

        <div className="mb-10">
          <DesignerStatCards />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
          <div className="space-y-8 lg:col-span-2">
            <QuickActionGrid />
            <ProjectPipeline />
          </div>
          <div className="space-y-8">
            <RecentCustomersPanel />
            <ArtisanFocusCard />
          </div>
        </div>
      </div>
      <SiteFooter />
    </DesignerShell>
  );
}
