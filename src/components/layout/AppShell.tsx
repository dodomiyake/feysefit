"use client";

import { useApp } from "@/context/AppContext";
import { Sidebar } from "./Sidebar";
import { DesignerShell } from "./DesignerShell";
import { CustomerShell } from "./CustomerShell";
import { AdminShell } from "./AdminShell";
import { BottomNav } from "./BottomNav";
import { Toast } from "@/components/ui/Toast";
import { AuthRouteGuard } from "@/components/auth/AuthRouteGuard";
import { SessionIdleGuard } from "@/components/auth/SessionIdleGuard";

interface AppShellProps {
  children: React.ReactNode;
  mobileTitle?: string;
  showMobileTopBar?: boolean;
  /** When set, mobile TopBar shows a back arrow instead of the logo. */
  mobileBackHref?: string;
}

/** Layout used for SSR and pre-hydration — must match server output when role is unknown. */
function NeutralShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="lg:pl-64">
        <main className="min-h-screen pb-24 lg:pb-8">{children}</main>
      </div>
      <Toast />
    </>
  );
}

export function AppShell({
  children,
  mobileTitle,
  showMobileTopBar = false,
  mobileBackHref,
}: AppShellProps) {
  const { role, hydrated } = useApp();

  if (!hydrated) {
    return (
      <NeutralShell>
        <SessionIdleGuard />
        <AuthRouteGuard>{children}</AuthRouteGuard>
      </NeutralShell>
    );
  }

  if (role === "designer") {
    return (
      <DesignerShell
        mobileTitle={mobileTitle}
        showMobileTopBar={showMobileTopBar}
        mobileBackHref={mobileBackHref}
      >
        <SessionIdleGuard />
        <AuthRouteGuard>{children}</AuthRouteGuard>
      </DesignerShell>
    );
  }

  if (role === "customer") {
    return (
      <CustomerShell
        mobileTitle={mobileTitle}
        showMobileTopBar={showMobileTopBar}
        mobileBackHref={mobileBackHref}
      >
        <SessionIdleGuard />
        <AuthRouteGuard>{children}</AuthRouteGuard>
      </CustomerShell>
    );
  }

  if (role === "admin") {
    return (
      <AdminShell>
        <SessionIdleGuard />
        <AuthRouteGuard>{children}</AuthRouteGuard>
      </AdminShell>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="lg:pl-64">
        <main className="min-h-screen pb-24 lg:pb-8">
          <SessionIdleGuard />
          <AuthRouteGuard>{children}</AuthRouteGuard>
        </main>
      </div>
      <BottomNav />
      <Toast />
    </>
  );
}
