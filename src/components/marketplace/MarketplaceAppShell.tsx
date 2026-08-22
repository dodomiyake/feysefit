"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { AuthRouteGuard } from "@/components/auth/AuthRouteGuard";
import { SessionIdleGuard } from "@/components/auth/SessionIdleGuard";
import { Toast } from "@/components/ui/Toast";
import { useApp } from "@/context/AppContext";
import { PublicMarketplaceFooter } from "./PublicMarketplaceFooter";
import { PublicMarketplaceHeader } from "./PublicMarketplaceHeader";

interface MarketplaceAppShellProps {
  children: React.ReactNode;
  title: string;
  backHref: string;
  /** Signed-in mobile top bar. Profile pages supply their own back control. */
  showSignedInTopBar?: boolean;
}

export function MarketplaceAppShell({
  children,
  title,
  backHref,
  showSignedInTopBar = true,
}: MarketplaceAppShellProps) {
  const { role } = useApp();

  if (!role) {
    return (
      <div className="flex min-h-screen flex-col">
        <PublicMarketplaceHeader />
        <main className="flex-1 pb-8">
          <SessionIdleGuard />
          <AuthRouteGuard>{children}</AuthRouteGuard>
        </main>
        <PublicMarketplaceFooter />
        <Toast />
      </div>
    );
  }

  return (
    <AppShell showMobileTopBar={false}>
      {showSignedInTopBar && <TopBar title={title} showBack backHref={backHref} />}
      <div className="flex min-h-[calc(100vh-4rem)] flex-col">
        <main className="flex-1">{children}</main>
        <PublicMarketplaceFooter />
      </div>
    </AppShell>
  );
}
