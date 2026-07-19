"use client";

import { DesignerSidebar } from "./DesignerSidebar";
import { DesignerHeader } from "./DesignerHeader";
import { BottomNav } from "./BottomNav";
import { Toast } from "@/components/ui/Toast";
import { TopBar } from "./TopBar";
import { ProjectsRealtimeSync } from "./ProjectsRealtimeSync";

interface DesignerShellProps {
  children: React.ReactNode;
  mobileTitle?: string;
  /** When false, pages supply their own mobile header (e.g. TopBar). Default true. */
  showMobileTopBar?: boolean;
  mobileBackHref?: string;
}

export function DesignerShell({
  children,
  mobileTitle = "Dashboard",
  showMobileTopBar = true,
  mobileBackHref,
}: DesignerShellProps) {
  return (
    <>
      <ProjectsRealtimeSync />
      <DesignerSidebar />
      <div className="lg:pl-64">
        <DesignerHeader />
        {showMobileTopBar && (
          <div className="lg:hidden">
            {mobileBackHref ? (
              <TopBar title={mobileTitle} showBack backHref={mobileBackHref} />
            ) : (
              <TopBar title={mobileTitle} showLogo />
            )}
          </div>
        )}
        <main className="flex min-h-screen flex-col pb-24 lg:pb-0 lg:pt-16">{children}</main>
      </div>
      <BottomNav />
      <Toast />
    </>
  );
}
