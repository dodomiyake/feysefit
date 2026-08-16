"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  MapPin,
  ShieldAlert,
  Star,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { TextArea } from "@/components/ui/TextArea";
import { cn } from "@/lib/cn";
import {
  resolveApprovalReviewProfile,
  verificationChecklist,
  type VerificationCheckId,
} from "@/lib/marketplace-approval-profiles";

interface AdminMarketplaceReviewProps {
  approvalId: string;
}

export function AdminMarketplaceReview({ approvalId }: AdminMarketplaceReviewProps) {
  const router = useRouter();
  const {
    marketplaceApprovals,
    designers,
    adminApproveMarketplace,
    adminDeclineMarketplace,
  } = useApp();

  const approval = marketplaceApprovals.find((a) => a.id === approvalId && a.status === "pending");
  const profile = approval ? resolveApprovalReviewProfile(approval, designers) : null;

  const [checks, setChecks] = useState<Record<VerificationCheckId, boolean>>({
    identity: false,
    portfolio: false,
    business: false,
    reports: false,
  });
  const [adminNotes, setAdminNotes] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  const allVerified = verificationChecklist.every((item) => checks[item.id]);

  if (!approval || !profile) {
    return (
      <Card padding="md" className="text-center">
        <p className="text-sm text-primary/60">
          This listing request is not available or has already been reviewed.
        </p>
        <Link
          href="/dashboard/admin/marketplace-approvals"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to approvals
        </Link>
      </Card>
    );
  }

  const handleApprove = () => {
    if (!allVerified) return;
    adminApproveMarketplace(approval.id, adminNotes.trim() || undefined);
    router.push("/dashboard/admin/marketplace-approvals");
  };

  const handleDecline = () => {
    adminDeclineMarketplace(approval.id, declineReason.trim() || adminNotes.trim() || undefined);
    router.push("/dashboard/admin/marketplace-approvals");
  };

  return (
    <div className="space-y-6">
      {profile.riskFlags.length > 0 && (
        <div className="flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Review carefully before approving</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-amber-900/85">
              {profile.riskFlags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card className="overflow-hidden p-0">
            <div className="relative h-40 sm:h-48">
              <Image src={profile.coverImage} alt="" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
            <div className="relative px-5 pb-5">
              <div className="absolute -top-10 left-5 h-20 w-20 overflow-hidden rounded-full border-4 border-card bg-card shadow-md">
                <Image
                  src={profile.profileImage}
                  alt={profile.designerName}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>

              <div className="min-h-20 min-w-0 pl-24 pt-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h2 className="font-headline text-xl font-bold leading-tight text-primary">
                    {profile.businessName}
                  </h2>
                  {profile.isRegistered ? (
                    <Badge variant="gold">Registered</Badge>
                  ) : (
                    <Badge variant="outline">Unverified applicant</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm leading-tight text-primary/60">
                  by {profile.designerName}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-primary/65">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-accent" />
                  {profile.location}
                </span>
                {profile.rating !== null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    {profile.rating} ({profile.reviewCount} reviews)
                  </span>
                )}
              </div>

              <p className="mt-4 text-sm leading-relaxed text-primary/75">{profile.bio}</p>
            </div>
          </Card>

          <section>
            <h3 className="font-headline text-lg font-semibold text-primary">Portfolio</h3>
            <p className="mt-1 text-sm text-primary/55">
              Verify images match the designer&apos;s stated specialty before approving.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {profile.portfolioImages.map((src, index) => (
                <div key={src} className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface">
                  <Image
                    src={src}
                    alt={`Portfolio ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Card padding="md" className="space-y-4">
            <h3 className="font-headline text-lg font-semibold text-primary">Account details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-primary/8 pb-3">
                <dt className="text-primary/55">Specialty</dt>
                <dd className="text-right font-medium text-primary">{profile.specialty}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-primary/8 pb-3">
                <dt className="text-primary/55">Email</dt>
                <dd className="text-right font-medium text-primary">{profile.email}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-primary/8 pb-3">
                <dt className="text-primary/55">Joined</dt>
                <dd className="text-right font-medium text-primary">{profile.joinedAt}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-primary/8 pb-3">
                <dt className="text-primary/55">Completed projects</dt>
                <dd className="text-right font-medium text-primary">{profile.completedProjects}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-primary/55">Open reports</dt>
                <dd
                  className={cn(
                    "text-right font-medium",
                    profile.openReports > 0 ? "text-red-600" : "text-primary"
                  )}
                >
                  {profile.openReports}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-primary/45">Submitted {approval.submittedAt}</p>
          </Card>

          <Card padding="md" className="space-y-4">
            <div>
              <h3 className="font-headline text-lg font-semibold text-primary">Verification checklist</h3>
              <p className="mt-1 text-sm text-primary/55">
                Complete all checks to confirm this designer is legitimate before listing them publicly.
              </p>
            </div>

            <ul className="space-y-3">
              {verificationChecklist.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer gap-3 rounded-lg border border-primary/10 bg-background p-3 transition-colors hover:border-accent/30">
                    <input
                      type="checkbox"
                      checked={checks[item.id]}
                      onChange={(e) =>
                        setChecks((prev) => ({ ...prev, [item.id]: e.target.checked }))
                      }
                      className="mt-1 h-4 w-4 rounded border-primary/20 text-accent focus:ring-accent"
                    />
                    <span>
                      <span className="block text-sm font-medium text-primary">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-primary/55">{item.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            {!allVerified && (
              <p className="flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Approve is locked until every verification step is completed.
              </p>
            )}
          </Card>

          <Card padding="md" className="space-y-4">
            <TextArea
              label="Admin notes (internal)"
              id="admin-notes"
              rows={3}
              placeholder="Document what you verified — ID check, portfolio source, etc."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />

            {!showDeclineForm ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 gap-1"
                  onClick={() => setShowDeclineForm(true)}
                >
                  <X className="h-4 w-4" />
                  Decline
                </Button>
                <Button
                  type="button"
                  variant="zinc"
                  className="flex-1 gap-1"
                  disabled={!allVerified}
                  onClick={handleApprove}
                >
                  <Check className="h-4 w-4" />
                  Approve listing
                </Button>
              </div>
            ) : (
              <div className="space-y-3 border-t border-primary/10 pt-4">
                <TextArea
                  label="Decline reason"
                  id="decline-reason"
                  rows={2}
                  placeholder="e.g. Portfolio could not be verified, suspicious duplicate images..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowDeclineForm(false)}>
                    Cancel
                  </Button>
                  <Button type="button" variant="secondary" className="gap-1" onClick={handleDecline}>
                    <X className="h-4 w-4" />
                    Confirm decline
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
