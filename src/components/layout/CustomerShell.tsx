"use client";

import { CustomerSidebar } from "./CustomerSidebar";
import { CustomerHeader } from "./CustomerHeader";
import { BottomNav } from "./BottomNav";
import { Toast } from "@/components/ui/Toast";
import { TopBar } from "./TopBar";
import { ProjectsRealtimeSync } from "./ProjectsRealtimeSync";

interface CustomerShellProps {
  children: React.ReactNode;
  mobileTitle?: string;
  showMobileTopBar?: boolean;
  mobileBackHref?: string;
}

export function CustomerShell({
  children,
  mobileTitle = "My Dashboard",
  showMobileTopBar = true,
  mobileBackHref,
}: CustomerShellProps) {
  return (
    <>
      <ProjectsRealtimeSync />
      <CustomerSidebar />
      <div className="lg:pl-64">
        <CustomerHeader />
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
