"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { resolveApprovalReviewProfile } from "@/lib/marketplace-approval-profiles";

interface AdminMarketplaceApprovalsProps {
  variant?: "compact" | "full";
}

export function AdminMarketplaceApprovals({ variant = "full" }: AdminMarketplaceApprovalsProps) {
  const { getPendingMarketplaceApprovals, designers } = useApp();

  const pending = getPendingMarketplaceApprovals();
  const visible = variant === "compact" ? pending.slice(0, 3) : pending;
  const isCompact = variant === "compact";

  if (pending.length === 0) {
    return (
      <section
        className={cn(
          "rounded-xl bg-surface-container shadow-sm",
          isCompact ? "p-6" : ""
        )}
      >
        {isCompact && (
          <div className="mb-4">
            <h2 className="font-headline text-lg font-semibold text-primary">Marketplace Approvals</h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-primary/45">
              Queue clear
            </p>
          </div>
        )}
        <Card padding="md">
          <p className="text-sm text-primary/60">No pending marketplace listings to review.</p>
        </Card>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "rounded-xl bg-surface-container shadow-sm",
        isCompact ? "p-6" : ""
      )}
    >
      {isCompact && (
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-lg font-semibold text-primary">Marketplace Approvals</h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-accent">
              {pending.length} New
            </p>
          </div>
        </div>
      )}

      {!isCompact && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-primary/60">
            Verify each designer before approving — review identity, portfolio, and reports.
          </p>
          <Badge variant="gold">{pending.length} pending</Badge>
        </div>
      )}

      <ul className="space-y-3">
        {visible.map((item) => {
          const profile = resolveApprovalReviewProfile(item, designers);
          const hasRisk = (profile?.riskFlags.length ?? 0) > 0;

          return (
            <li key={item.id}>
              <div className="rounded-lg border border-primary/8 bg-card px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-primary">{item.designerName}</p>
                      {profile?.isRegistered ? (
                        <Badge variant="gold">Registered</Badge>
                      ) : (
                        <Badge variant="outline">Needs verification</Badge>
                      )}
                      {hasRisk && (
                        <Badge className="bg-amber-100 text-amber-900">Elevated risk</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-primary/55">{item.specialty}</p>
                    <p className="mt-1 text-xs text-primary/45">
                      {item.businessName} · Submitted {item.submittedAt}
                    </p>
                  </div>
                  <Link href={`/dashboard/admin/marketplace-approvals/${item.id}`}>
                    <Button type="button" variant="zinc" size="sm" className="gap-1.5">
                      <ShieldCheck className="h-4 w-4" />
                      Review & verify
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {isCompact && (
        <Link href="/dashboard/admin/marketplace-approvals" className="mt-6 block">
          <Button type="button" variant="secondary" className="w-full">
            View All Requests
          </Button>
        </Link>
      )}
    </section>
  );
}
