"use client";

import { use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { DesignerPortfolioGallery } from "@/components/marketplace/DesignerPortfolioGallery";
import { MarketplaceGate } from "@/components/customer/MarketplaceGate";
import { useApp } from "@/context/AppContext";

export default function DesignerPortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { canAccessMarketplace, isDesignerMarketplaceLive, getDesignerById } = useApp();
  const designer = getDesignerById(id);

  if (!canAccessMarketplace) {
    return (
      <AppShell showMobileTopBar={false}>
        <TopBar title="Collections" showBack backHref={designer ? `/marketplace/${designer.id}` : "/marketplace"} />
        <MarketplaceGate>{null}</MarketplaceGate>
      </AppShell>
    );
  }

  if (!designer) {
    return (
      <AppShell showMobileTopBar={false}>
        <TopBar title="Collections" showBack backHref="/marketplace" />
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

  if (!isDesignerMarketplaceLive(designer.id)) {
    return (
      <AppShell showMobileTopBar={false}>
        <TopBar title="Collections" showBack backHref="/marketplace" />
        <div className="mx-auto max-w-lg px-5 py-16 text-center">
          <h1 className="font-headline text-2xl font-bold text-primary">Gallery unavailable</h1>
          <p className="mt-3 text-sm text-primary/60">
            This designer&apos;s portfolio is not currently listed on the marketplace.
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
      <DesignerPortfolioGallery designer={designer} />
    </AppShell>
  );
}
