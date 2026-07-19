"use client";

import { AppShell } from "@/components/layout/AppShell";
import { SettingsContent } from "@/components/settings/SettingsContent";
import { useDashboardHref } from "@/lib/use-dashboard-href";

export default function SettingsPage() {
  const dashboardHref = useDashboardHref();

  return (
    <AppShell mobileTitle="Settings" showMobileTopBar mobileBackHref={dashboardHref}>
      <SettingsContent />
    </AppShell>
  );
}
