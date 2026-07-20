"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { AppointmentRequestPanel } from "@/components/marketplace/AppointmentRequestPanel";
import { CustomerAppointmentsCard } from "@/components/customer/CustomerAppointmentsCard";
import { useApp } from "@/context/AppContext";
import { isLinkedCustomer } from "@/lib/customer-access";
import { getDesignerById as fetchDesignerById } from "@/lib/services/designerService";
import type { Designer } from "@/lib/mock-data";
import { CalendarDays } from "lucide-react";

export default function MyAppointmentsPage() {
  const router = useRouter();
  const { customerLink, getDesignerById } = useApp();
  const linkedId = customerLink.linkedDesignerId;
  const fromContext = linkedId ? getDesignerById(linkedId) : undefined;
  const [designer, setDesigner] = useState<Designer | undefined>(fromContext);
  const [loadingDesigner, setLoadingDesigner] = useState(Boolean(linkedId && !fromContext));

  useEffect(() => {
    if (!isLinkedCustomer(customerLink) || !customerLink.linkedDesignerId) {
      router.replace("/dashboard/customer");
    }
  }, [customerLink, router]);

  useEffect(() => {
    if (fromContext) {
      setDesigner(fromContext);
      setLoadingDesigner(false);
      return;
    }
    if (!linkedId) {
      setDesigner(undefined);
      setLoadingDesigner(false);
      return;
    }

    let cancelled = false;
    setLoadingDesigner(true);
    void fetchDesignerById(linkedId)
      .then((loaded) => {
        if (!cancelled) setDesigner(loaded ?? undefined);
      })
      .catch(() => {
        if (!cancelled) setDesigner(undefined);
      })
      .finally(() => {
        if (!cancelled) setLoadingDesigner(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fromContext, linkedId]);

  if (!isLinkedCustomer(customerLink) || !customerLink.linkedDesignerId) {
    return null;
  }

  return (
    <AppShell showMobileTopBar={false}>
      <TopBar title="Appointments" showBack backHref="/dashboard/customer" />
      <div className="mx-auto max-w-3xl px-5 pb-12 pt-6 lg:px-8 lg:pt-8">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-accent" />
            <h1 className="font-headline text-2xl font-bold text-primary lg:text-3xl">
              Appointments
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-primary/60">
            Book an open slot with{" "}
            {customerLink.linkedDesignerName ?? designer?.businessName ?? "your designer"}, or review
            requests that are already scheduled.
          </p>
        </div>

        <div className="space-y-6">
          {loadingDesigner ? (
            <p className="text-sm text-primary/60">Loading your designer&apos;s calendar…</p>
          ) : designer ? (
            <AppointmentRequestPanel designer={designer} />
          ) : (
            <section className="rounded-2xl border border-primary/10 bg-card/50 p-5">
              <p className="text-sm text-primary/70">
                We could not load your designer&apos;s calendar. Refresh the page, or open My Designer
                and try again.
              </p>
            </section>
          )}
          <CustomerAppointmentsCard variant="page" />
        </div>
      </div>
    </AppShell>
  );
}
