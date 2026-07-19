"use client";

import { AppShell } from "@/components/layout/AppShell";
import { AccountSecurityContent } from "@/components/settings/AccountSecurityContent";

export default function AccountSecurityPage() {
  return (
    <AppShell mobileTitle="Security" showMobileTopBar mobileBackHref="/settings">
      <AccountSecurityContent />
    </AppShell>
  );
}
