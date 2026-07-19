"use client";

import { AppShell } from "@/components/layout/AppShell";
import { InviteCustomerContent } from "@/components/invite/InviteCustomerContent";

export default function InviteCustomerPage() {
  return (
    <AppShell
      mobileTitle="Invite Client"
      showMobileTopBar
      mobileBackHref="/dashboard/designer"
    >
      <InviteCustomerContent />
    </AppShell>
  );
}
