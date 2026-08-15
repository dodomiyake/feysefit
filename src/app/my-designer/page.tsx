"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { CustomerDesignerPanel } from "@/components/customer/CustomerDesignerPanel";
import { CustomerAppointmentsCard } from "@/components/customer/CustomerAppointmentsCard";
import { AppointmentRequestPanel } from "@/components/marketplace/AppointmentRequestPanel";
import { useApp } from "@/context/AppContext";
import { isLinkedCustomer } from "@/lib/customer-access";
import { getDesignerById as fetchDesignerById } from "@/lib/services/designerService";
import type { Designer } from "@/lib/mock-data";
import { Calendar } from "lucide-react";

export default function MyDesignerPage() {
  const router = useRouter();
  const { customerLink, getDesignerById } = useApp();
  const linkedId = customerLink.linkedDesignerId;
  const fromContext = linkedId ? getDesignerById(linkedId) : undefined;
  const [fetchedDesigner, setFetchedDesigner] = useState<Designer | undefined>();
  const designer = fromContext ?? fetchedDesigner;
  const [loadingDesigner, setLoadingDesigner] = useState(Boolean(linkedId && !fromContext));

  useEffect(() => {
    if (!isLinkedCustomer(customerLink) || !customerLink.linkedDesignerId) {
      router.replace("/dashboard/customer");
    }
  }, [customerLink, router]);

  useEffect(() => {
    if (fromContext || !linkedId) return;

    let cancelled = false;
    void fetchDesignerById(linkedId)
      .then((loaded) => {
        if (!cancelled) setFetchedDesigner(loaded ?? undefined);
      })
      .catch(() => {
        if (!cancelled) setFetchedDesigner(undefined);
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

  if (loadingDesigner) {
    return (
      <AppShell showMobileTopBar={false}>
        <TopBar title="My Designer" showBack backHref="/dashboard/customer" />
        <div className="mx-auto max-w-lg px-5 py-16 text-center">
          <h1 className="font-headline text-2xl font-bold text-primary">Loading your designer…</h1>
          <p className="mt-3 text-sm text-primary/60">Fetching available appointment times.</p>
        </div>
      </AppShell>
    );
  }

  if (!designer) {
    return (
      <AppShell showMobileTopBar={false}>
        <TopBar title="My Designer" showBack backHref="/dashboard/customer" />
        <div className="mx-auto max-w-lg px-5 py-16 text-center">
          <h1 className="font-headline text-2xl font-bold text-primary">Designer profile unavailable</h1>
          <p className="mt-3 text-sm text-primary/60">
            We could not load your designer&apos;s profile. Try refreshing, or contact support if this
            continues.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showMobileTopBar={false}>
      <TopBar title="My Designer" showBack backHref="/dashboard/customer" />
      <div className="mx-auto max-w-5xl px-5 pb-12 pt-6 lg:px-8 lg:pt-8">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" />
            <h1 className="font-headline text-2xl font-bold text-primary lg:text-3xl">
              {customerLink.linkedDesignerName ?? designer.businessName}
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-primary/60">
            You are privately linked to this designer. Request sessions from Appointments, or review
            their profile details here.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-4">
            <CustomerDesignerPanel designer={designer} />
          </div>
          <div className="space-y-6 lg:col-span-8">
            <AppointmentRequestPanel designer={designer} />
            <CustomerAppointmentsCard variant="embedded" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
