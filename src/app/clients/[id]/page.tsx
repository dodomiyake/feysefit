"use client";

import { use, useEffect, useState } from "react";
import { DesignerShell } from "@/components/layout/DesignerShell";
import { TopBar } from "@/components/layout/TopBar";
import { DesktopBackNav } from "@/components/ui/BackButton";
import { AppCustomerProfileView } from "@/components/designer/AppCustomerProfileView";
import { useApp } from "@/context/AppContext";
import { getCustomerForDesigner } from "@/lib/services/customerService";
import type { Customer } from "@/lib/mock-data";

export default function AppCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { authUser, customers, showToast } = useApp();
  const designerId = authUser?.designerId ?? "";
  const [customer, setCustomer] = useState<Customer | null>(
    () => customers.find((entry) => entry.id === id) ?? null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!designerId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await getCustomerForDesigner(designerId, id);
        if (!cancelled) setCustomer(result);
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : "Failed to load client", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [designerId, id, showToast]);

  return (
    <DesignerShell mobileTitle="App client" showMobileTopBar={false}>
      <TopBar title="App Client" showBack backHref="/clients" />
      <div className="mx-auto max-w-4xl px-5 pb-12 pt-6 lg:px-16">
        <DesktopBackNav href="/clients" label="Back to clients" />

        {loading ? (
          <p className="text-primary/60">Loading…</p>
        ) : !customer ? (
          <div className="rounded-xl border border-primary/10 bg-surface-container p-8 text-center">
            <p className="font-medium text-primary">Client not found</p>
            <p className="mt-2 text-sm text-primary/60">
              This app customer is not linked to your studio, or the profile does not exist.
            </p>
          </div>
        ) : (
          <AppCustomerProfileView customer={customer} />
        )}
      </div>
    </DesignerShell>
  );
}
