"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getMarketplaceBlockReason } from "@/lib/customer-access";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Store, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function MarketplaceGate({ children }: { children: React.ReactNode }) {
  const { role, canAccessMarketplace, customerLink } = useApp();

  if (role !== "customer" || canAccessMarketplace) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-12 lg:py-20">
      <Card className="text-center" padding="lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-highlight/15">
          <Lock className="h-8 w-8 text-accent" />
        </div>
        <h1 className="mt-6 font-headline text-2xl font-bold text-primary">Marketplace unavailable</h1>
        <p className="mt-3 text-sm leading-relaxed text-primary/70">
          {getMarketplaceBlockReason(customerLink)}
        </p>

        {customerLink.linkedDesignerName && (
          <p className="mt-4 rounded-lg bg-background px-4 py-3 text-sm text-primary/80">
            Linked to <span className="font-medium">{customerLink.linkedDesignerName}</span>
          </p>
        )}

        <div className="mt-8 space-y-3">
          {customerLink.unlinkStatus === "none" || customerLink.unlinkStatus === "declined" ? (
            <Link href="/settings#unlink">
              <Button className="w-full">Request to unlink</Button>
            </Link>
          ) : null}
          <Link href="/dashboard/customer">
            <Button variant="secondary" className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </Button>
          </Link>
        </div>
      </Card>

      <div className="mt-6 flex items-start gap-3 rounded-xl bg-card p-4">
        <Store className="h-5 w-5 shrink-0 text-accent mt-0.5" />
        <p className="text-xs text-primary/60">
          Invited clients work privately with their designer. You can browse the marketplace after
          delivering a project, or once admin approves a formal unlink request.
        </p>
      </div>
    </div>
  );
}

export function useMarketplaceRedirect() {
  const { role, canAccessMarketplace } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (role === "customer" && !canAccessMarketplace) {
      router.replace("/marketplace");
    }
  }, [role, canAccessMarketplace, router]);
}
