"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Clock3, Inbox, Loader2, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  displayMarketplaceEnquiryStatus,
  marketplaceEnquiryCanBeAnswered,
  marketplaceEnquiryCanBeCancelled,
  marketplaceEnquiryStatusLabel,
  type MarketplaceEnquiry,
  type MarketplaceEnquiryStatus,
} from "@/lib/marketplace-enquiries";
import {
  cancelMarketplaceEnquiry,
  createProjectFromMarketplaceEnquiry,
  listMarketplaceEnquiries,
  respondToMarketplaceEnquiry,
} from "@/lib/services/marketplaceEnquiryService";

const statusVariant: Record<MarketplaceEnquiryStatus, "gold" | "outline" | "default"> = {
  pending: "outline",
  accepted: "gold",
  declined: "default",
  cancelled: "default",
  expired: "default",
};

function formatDate(value: string | null): string {
  if (!value) return "Not specified";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(parsed));
}

export function MarketplaceEnquiriesView() {
  const router = useRouter();
  const { role, authUser, showToast, refreshAppData } = useApp();
  const [enquiries, setEnquiries] = useState<MarketplaceEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEnquiries(await listMarketplaceEnquiries());
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not load enquiries.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (role !== "customer" && role !== "designer") return;
    let cancelled = false;
    void listMarketplaceEnquiries()
      .then((items) => {
        if (!cancelled) setEnquiries(items);
      })
      .catch((error) => {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : "Could not load enquiries.", "error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role, showToast]);

  const respond = async (enquiry: MarketplaceEnquiry, decision: "accepted" | "declined") => {
    setBusyId(enquiry.id);
    try {
      await respondToMarketplaceEnquiry({ enquiryId: enquiry.id, decision });
      await Promise.all([load(), refreshAppData()]);
      showToast(
        decision === "accepted"
          ? `${enquiry.customerName} is now linked to your atelier. You can create their project.`
          : "Enquiry declined. No relationship or private access was created."
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not answer enquiry.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (enquiry: MarketplaceEnquiry) => {
    setBusyId(enquiry.id);
    try {
      await cancelMarketplaceEnquiry(enquiry.id);
      await load();
      showToast("Enquiry cancelled.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not cancel enquiry.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const createProject = async (enquiry: MarketplaceEnquiry) => {
    if (!authUser?.designerId) {
      showToast("Designer profile not found. Sign in again.", "error");
      return;
    }
    setBusyId(enquiry.id);
    try {
      const projectId = await createProjectFromMarketplaceEnquiry(enquiry.id);
      await refreshAppData();
      showToast("Project created. Full project messaging and collaboration are now available.");
      router.push(`/projects/${projectId}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not create project.", "error");
    } finally {
      setBusyId(null);
    }
  };

  if (role !== "customer" && role !== "designer") {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8">
        <p className="text-sm text-primary/60">Enquiries are available to clients and designers.</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Marketplace
          </p>
          <h1 className="mt-2 font-headline text-3xl font-semibold text-primary lg:text-4xl">
            {role === "designer" ? "Client enquiries" : "Your enquiries"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary/60">
            {role === "designer"
              ? "Accept only commissions you want to discuss. A private relationship is created only after acceptance."
              : "Track requests without sharing measurements, files, or private project information before acceptance."}
          </p>
        </div>
        {role === "customer" && (
          <Link href="/marketplace" className="text-sm font-semibold text-accent hover:underline">
            Find another designer
          </Link>
        )}
      </div>

      {loading ? (
        <div className="mt-10 flex min-h-48 items-center justify-center rounded-2xl border border-primary/10 bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-accent" aria-label="Loading enquiries" />
        </div>
      ) : enquiries.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-primary/10 bg-card px-6 py-14 text-center">
          <Inbox className="mx-auto h-8 w-8 text-accent" />
          <h2 className="mt-4 font-headline text-xl font-semibold text-primary">No enquiries yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-primary/60">
            {role === "designer"
              ? "New marketplace enquiries will appear here."
              : "Choose a designer and send a commission enquiry when you are ready."}
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {enquiries.map((enquiry) => {
            const status = displayMarketplaceEnquiryStatus(enquiry);
            const busy = busyId === enquiry.id;
            return (
              <article
                key={enquiry.id}
                className="rounded-2xl border border-primary/10 bg-card p-5 shadow-warm lg:p-7"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant[status]}>{marketplaceEnquiryStatusLabel[status]}</Badge>
                      <span className="text-xs text-primary/45">Sent {formatDate(enquiry.createdAt)}</span>
                    </div>
                    <h2 className="mt-3 font-headline text-xl font-semibold text-primary">
                      {enquiry.outfitType}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-primary/70">
                      {role === "designer" ? enquiry.customerName : enquiry.designerName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-primary/55">
                    <CalendarDays className="h-4 w-4" />
                    Preferred deadline: {formatDate(enquiry.preferredDeadline)}
                  </div>
                </div>

                <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-primary/70">
                  {enquiry.description}
                </p>
                <dl className="mt-5 grid gap-3 rounded-xl bg-surface-container p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-primary/45">Budget</dt>
                    <dd className="mt-1 font-medium text-primary">{enquiry.budget ?? "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-primary/45">Consultation</dt>
                    <dd className="mt-1 font-medium capitalize text-primary">
                      {enquiry.consultationPreference ?? "No preference"}
                    </dd>
                  </div>
                </dl>

                {enquiry.designerResponse && (
                  <p className="mt-4 rounded-xl border border-primary/10 px-4 py-3 text-sm text-primary/70">
                    <span className="font-semibold text-primary">Designer response: </span>
                    {enquiry.designerResponse}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-primary/10 pt-5">
                  {role === "designer" && marketplaceEnquiryCanBeAnswered(enquiry) && (
                    <>
                      <Button disabled={busy} onClick={() => void respond(enquiry, "accepted")}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Accept enquiry
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void respond(enquiry, "declined")}
                      >
                        <X className="h-4 w-4" />
                        Decline
                      </Button>
                    </>
                  )}
                  {role === "designer" && status === "accepted" && !enquiry.projectId && (
                    <Button disabled={busy} onClick={() => void createProject(enquiry)}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Create project
                    </Button>
                  )}
                  {enquiry.projectId && (
                    <Link href={`/projects/${enquiry.projectId}`}>
                      <Button>Open project</Button>
                    </Link>
                  )}
                  {role === "customer" && marketplaceEnquiryCanBeCancelled(enquiry) && (
                    <Button variant="secondary" disabled={busy} onClick={() => void cancel(enquiry)}>
                      Cancel enquiry
                    </Button>
                  )}
                  {status === "pending" && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-primary/45">
                      <Clock3 className="h-4 w-4" /> Expires {formatDate(enquiry.expiresAt)}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
