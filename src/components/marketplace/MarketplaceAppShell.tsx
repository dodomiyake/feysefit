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
      <>
        <PublicMarketplaceHeader />
        <main className="min-h-screen pb-8">
          <SessionIdleGuard />
          <AuthRouteGuard>{children}</AuthRouteGuard>
        </main>
        <PublicMarketplaceFooter />
        <Toast />
      </>
    );
  }

  return (
    <AppShell showMobileTopBar={false}>
      {showSignedInTopBar && <TopBar title={title} showBack backHref={backHref} />}
      {children}
    </AppShell>
  );
}
