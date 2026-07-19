"use client";

import { Suspense } from "react";
import { DesignerShell } from "@/components/layout/DesignerShell";
import { TopBar } from "@/components/layout/TopBar";
import { DesktopBackNav } from "@/components/ui/BackButton";
import { AppointmentsManager } from "@/components/designer/AppointmentsManager";

export default function AppointmentsPage() {
  return (
    <DesignerShell mobileTitle="Appointments" showMobileTopBar={false}>
      <TopBar title="Appointments" showBack backHref="/dashboard/designer" />
      <div className="mx-auto max-w-6xl px-5 pb-12 pt-6 lg:px-16">
        <DesktopBackNav href="/dashboard/designer" label="Back to dashboard" />
        <Suspense fallback={<p className="text-sm text-primary/60">Loading appointments…</p>}>
          <AppointmentsManager />
        </Suspense>
      </div>
    </DesignerShell>
  );
}
