"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { DesignerProfileView } from "@/components/marketplace/DesignerProfileView";
import { MarketplaceGate } from "@/components/customer/MarketplaceGate";
import { useApp } from "@/context/AppContext";
import { LINKED_DESIGNER_PAGE_HREF } from "@/lib/customer-designer-links";

export default function DesignerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { canAccessMarketplace, customerLink, isDesignerMarketplaceLive, getDesignerById } =
    useApp();
  const designer = getDesignerById(id);
  const isOwnLinkedDesigner = customerLink.linkedDesignerId === id;

  useEffect(() => {
    if (!canAccessMarketplace && isOwnLinkedDesigner) {
      router.replace(LINKED_DESIGNER_PAGE_HREF);
    }
  }, [canAccessMarketplace, isOwnLinkedDesigner, router]);

  if (!canAccessMarketplace && !isOwnLinkedDesigner) {
    return (
      <AppShell showMobileTopBar={false}>
        <TopBar title="Designer Profile" showBack backHref="/dashboard/customer" />
        <MarketplaceGate>{null}</MarketplaceGate>
      </AppShell>
    );
  }

  if (!canAccessMarketplace && isOwnLinkedDesigner) {
    return null;
  }

  if (!designer) {
    return (
      <AppShell showMobileTopBar={false}>
        <TopBar title="Designer Profile" showBack backHref="/marketplace" />
        <div className="mx-auto max-w-lg px-5 py-16 text-center">
          <h1 className="font-headline text-2xl font-bold text-primary">Designer not found</h1>
          <p className="mt-3 text-sm text-primary/60">
            This profile does not exist or may have been removed.
          </p>
          <Link
            href="/marketplace"
            className="mt-6 inline-block text-sm font-medium text-accent hover:underline"
          >
            Back to marketplace
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!isDesignerMarketplaceLive(designer.id) && !isOwnLinkedDesigner) {
    return (
      <AppShell showMobileTopBar={false}>
        <TopBar title="Designer Profile" showBack backHref="/marketplace" />
        <div className="mx-auto max-w-lg px-5 py-16 text-center">
          <h1 className="font-headline text-2xl font-bold text-primary">Profile unavailable</h1>
          <p className="mt-3 text-sm text-primary/60">
            This designer profile is not currently listed on the marketplace.
          </p>
          <Link
            href="/marketplace"
            className="mt-6 inline-block text-sm font-medium text-accent hover:underline"
          >
            Back to marketplace
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showMobileTopBar={false}>
      <DesignerProfileView designer={designer} />
    </AppShell>
  );
}
