"use client";

import { useState } from "react";
import { InviteBreadcrumb } from "@/components/invite/InviteBreadcrumb";
import { InviteCustomerForm } from "@/components/invite/InviteCustomerForm";
import { InviteEmailSandboxNotice } from "@/components/invite/InviteEmailSandboxNotice";
import { InviteEditorialPanel } from "@/components/invite/InviteEditorialPanel";
import { InviteOpenSlotsCard } from "@/components/invite/InviteOpenSlotsCard";
import { PendingInvitesSidebar } from "@/components/invite/PendingInvitesSidebar";
import type { PendingInvite } from "@/lib/mock-data";

export function InviteCustomerContent() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleInviteCreated = (_invite: PendingInvite) => {
    setRefreshKey((current) => current + 1);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pb-10 pt-6 lg:px-16 lg:pb-12 lg:pt-8">
      <div className="mb-8 lg:mb-10">
        <div className="hidden lg:block">
          <InviteBreadcrumb />
        </div>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-primary lg:text-4xl">
          Expand Your Atelier
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted lg:text-base">
          Create a private invitation link for new clients. They can sign up and connect with your
          atelier in one step.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8">
          <InviteEmailSandboxNotice />
          <InviteCustomerForm onInviteCreated={handleInviteCreated} />
        </div>
        <aside className="space-y-6 lg:col-span-4">
          <InviteOpenSlotsCard />
          <PendingInvitesSidebar refreshKey={refreshKey} />
          <InviteEditorialPanel />
        </aside>
      </div>
    </div>
  );
}
