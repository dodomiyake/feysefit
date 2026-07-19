"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { DesktopBackNav } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Select } from "@/components/ui/Select";
import { CommissionDefaultsPreview } from "@/components/ui/PaletteSwatches";
import { Badge } from "@/components/ui/Badge";
import { MarketplaceGate } from "@/components/customer/MarketplaceGate";
import { useApp } from "@/context/AppContext";
import { isLocalDemoMode, isSupabaseEnabled } from "@/lib/config/backend";
import {
  buildMarketplaceRequestMessage,
  resolveMarketplaceOutfitLabel,
  submitMarketplaceDesignRequest,
} from "@/lib/services/marketplaceService";
import {
  messageThreadWithDraft,
  projectMessageThreadHref,
} from "@/lib/message-links";
import { projectOutfitTypes } from "@/lib/project-outfit-types";
import { Loader2, MapPin, Star } from "lucide-react";

export default function RequestDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    canAccessMarketplace,
    isDesignerMarketplaceLive,
    showToast,
    linkCustomerToDesigner,
    getDesignerById,
    authUser,
    role,
    refreshAppData,
  } = useApp();
  const designer = getDesignerById(id);
  const useSupabase = isSupabaseEnabled();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!designer) return;

    const form = new FormData(e.currentTarget);
    const outfitType = String(form.get("outfit") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const budget = String(form.get("budget") ?? "").trim();
    const deadline = String(form.get("deadline") ?? "").trim();

    if (!outfitType) {
      showToast("Select an outfit type.", "error");
      return;
    }
    if (!description) {
      showToast("Describe your vision before sending.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const outfitLabel = resolveMarketplaceOutfitLabel(outfitType);
      const message = buildMarketplaceRequestMessage({
        designerFirstName: designer.designerName.split(" ")[0],
        outfitLabel,
        description,
        budget,
        deadline,
      });

      if (useSupabase) {
        if (!authUser?.customerId) {
          throw new Error("Sign in as a client to send a design request.");
        }

        const { projectId } = await submitMarketplaceDesignRequest({
          designerLegacyId: designer.id,
          designerDisplayName: designer.businessName,
          customerLegacyId: authUser.customerId,
          customerName: authUser.name,
          customerUserId: authUser.id,
          outfitType,
          description,
          budget,
          deadline,
        });

        await refreshAppData();
        showToast(
          `Design request sent to ${designer.businessName}. You're now linked privately.`
        );
        router.push(projectMessageThreadHref(projectId));
        return;
      }

      linkCustomerToDesigner(designer.id, { source: "marketplace" });
      showToast(
        `Design request sent to ${designer.businessName}. You're now linked privately.`
      );
      router.push(messageThreadWithDraft(`designer-${designer.id}`, message));
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not send design request.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!canAccessMarketplace) {
    return (
      <AppShell>
        <TopBar title="Request Design" showBack backHref={`/marketplace/${id}`} />
        <MarketplaceGate>{null}</MarketplaceGate>
      </AppShell>
    );
  }

  if (role === "designer") {
    return (
      <AppShell>
        <TopBar title="Request Design" showBack backHref={`/marketplace/${id}`} />
        <div className="mx-auto max-w-lg px-5 py-16 text-center lg:px-16">
          <p className="text-sm text-primary/60">
            Design requests are for clients. Browse the marketplace from your designer dashboard
            instead.
          </p>
          <Link
            href="/marketplace"
            className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
          >
            Back to marketplace
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!designer || !isDesignerMarketplaceLive(designer.id)) {
    return (
      <AppShell>
        <TopBar title="Request Design" showBack backHref="/marketplace" />
        <div className="mx-auto max-w-lg px-5 py-16 text-center lg:px-16">
          <p className="text-sm text-primary/60">This designer is not available for requests.</p>
          <Link href="/marketplace" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
            Back to marketplace
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar title="Request Design" showBack backHref={`/marketplace/${designer.id}`} />
      <div className="mx-auto max-w-2xl px-5 py-6 lg:px-16 lg:py-10">
        <DesktopBackNav href={`/marketplace/${designer.id}`} label="Back to profile" />

        <h1 className="font-headline text-2xl font-bold text-primary lg:text-3xl">
          Request a design
        </h1>
        <p className="mt-2 text-sm text-primary/60">
          Send a commission enquiry to {designer.businessName}. We&apos;ll create a project and
          open a secure chat with your request details.
        </p>

        <Link
          href={`/marketplace/${designer.id}`}
          className="mt-6 flex gap-4 rounded-xl border border-primary/10 bg-card p-5 transition-colors hover:border-highlight/30"
        >
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-background shadow-sm">
            <Image
              src={designer.profileImage}
              alt={designer.designerName}
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-headline text-lg font-semibold text-primary">{designer.businessName}</p>
            <p className="text-sm text-primary/70">{designer.designerName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge>{designer.specialty}</Badge>
              <span className="flex items-center gap-1 text-xs text-primary/55">
                <MapPin className="h-3 w-3" />
                {designer.location}
              </span>
              <span className="flex items-center gap-1 text-xs text-primary/70">
                <Star className="h-3 w-3 fill-accent text-accent" />
                {designer.rating}
              </span>
            </div>
          </div>
        </Link>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Select
            label="Outfit type"
            id="outfit"
            name="outfit"
            required
            options={projectOutfitTypes.filter((option) => option.value)}
          />
          <TextArea
            label="Describe your vision"
            id="description"
            name="description"
            rows={4}
            placeholder="Occasion, fabric preferences, timeline, and any inspiration..."
            required
          />
          <Input
            label="Target budget (optional)"
            id="budget"
            name="budget"
            placeholder="e.g. £800 – £1,200"
          />
          <Input label="Preferred deadline (optional)" id="deadline" name="deadline" type="date" />

          <CommissionDefaultsPreview />

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending request…
              </span>
            ) : (
              "Send request"
            )}
          </Button>
          {isLocalDemoMode() && (
            <p className="text-center text-xs text-primary/50">
              Demo mode sends your request as a draft message. Supabase creates a full project.
            </p>
          )}
        </form>
      </div>
    </AppShell>
  );
}
