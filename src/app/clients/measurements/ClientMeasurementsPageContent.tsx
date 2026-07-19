"use client";

import { useSearchParams } from "next/navigation";
import { DesignerShell } from "@/components/layout/DesignerShell";
import { TopBar } from "@/components/layout/TopBar";
import { DesktopBackNav } from "@/components/ui/BackButton";
import { DesignerClientMeasurementsView } from "@/components/designer/DesignerClientMeasurementsView";

export function ClientMeasurementsPageContent() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customer");

  return (
    <DesignerShell mobileTitle="Client Measurements" showMobileTopBar={false}>
      <TopBar title="Client Measurements" showBack backHref="/clients" />
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-6 lg:px-16 lg:pb-12">
        <DesktopBackNav href="/clients" label="Back to clients" />
        <div className="mb-8 max-w-2xl">
          <h1 className="font-headline text-2xl font-bold text-primary lg:text-[1.75rem]">
            Client Measurements
          </h1>
          <p className="mt-2 text-sm text-primary/60 lg:text-base">
            Review submitted measurement profiles for your linked clients. Measurements stay private
            between you and each customer.
          </p>
        </div>

        <DesignerClientMeasurementsView initialCustomerId={customerId} />
      </div>
    </DesignerShell>
  );
}
