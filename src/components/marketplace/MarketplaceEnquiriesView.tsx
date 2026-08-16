"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock3,
  Inbox,
  Loader2,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import {
  displayMarketplaceEnquiryStatus,
  marketplaceEnquiryCanBeAnswered,
  marketplaceEnquiryCanBeLinked,
  marketplaceEnquiryCanBeCancelled,
  marketplaceEnquiryCanConfirmCustomerAgreement,
  marketplaceEnquiryCanBeDiscussed,
  marketplaceEnquiryStatusLabel,
  type MarketplaceEnquiry,
  type MarketplaceEnquiryMessage,
  type MarketplaceEnquiryStatus,
} from "@/lib/marketplace-enquiries";
import {
  cancelMarketplaceEnquiry,
  acceptMarketplaceEnquiryForDiscussion,
  confirmMarketplaceEnquiryAgreement,
  confirmMarketplaceEnquiryCustomerAgreement,
  createProjectFromMarketplaceEnquiry,
  listMarketplaceEnquiries,
  listMarketplaceEnquiryMessages,
  respondToMarketplaceEnquiry,
  sendMarketplaceEnquiryMessage,
} from "@/lib/services/marketplaceEnquiryService";

const statusVariant: Record<MarketplaceEnquiryStatus, "gold" | "outline" | "default"> = {
  pending: "outline",
  discussing: "outline",
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

function formatMessageTime(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed));
}

async function fetchEnquiriesWithMessages(): Promise<{
  enquiries: MarketplaceEnquiry[];
  messages: Record<string, MarketplaceEnquiryMessage[]>;
}> {
  const enquiries = await listMarketplaceEnquiries();
  const messages = await listMarketplaceEnquiryMessages(enquiries.map((item) => item.id));
  return { enquiries, messages };
}

export function MarketplaceEnquiriesView() {
  const router = useRouter();
  const { role, authUser, showToast, refreshAppData } = useApp();
  const [enquiries, setEnquiries] = useState<MarketplaceEnquiry[]>([]);
  const [messagesByEnquiry, setMessagesByEnquiry] = useState<
    Record<string, MarketplaceEnquiryMessage[]>
  >({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    enquiryId: string;
    action: "customer-agreement" | "designer-link";
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { enquiries: items, messages } = await fetchEnquiriesWithMessages();
      setEnquiries(items);
      setMessagesByEnquiry(messages);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not load enquiries.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (role !== "customer" && role !== "designer") return;
    let cancelled = false;
    void fetchEnquiriesWithMessages()
      .then(({ enquiries: items, messages }) => {
        if (cancelled) return;
        setEnquiries(items);
        setMessagesByEnquiry(messages);
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

  const sendReply = async (enquiry: MarketplaceEnquiry) => {
    const body = drafts[enquiry.id]?.trim() ?? "";
    if (!body) {
      showToast("Write a reply before sending.", "error");
      return;
    }

    setBusyId(enquiry.id);
    try {
      if (role === "designer" && marketplaceEnquiryCanBeAnswered(enquiry)) {
        await acceptMarketplaceEnquiryForDiscussion({ enquiryId: enquiry.id, body });
      } else {
        await sendMarketplaceEnquiryMessage({ enquiryId: enquiry.id, body });
      }
      setDrafts((current) => ({ ...current, [enquiry.id]: "" }));
      setConfirmation(null);
      await load();
      showToast(
        role === "designer" && marketplaceEnquiryCanBeAnswered(enquiry)
          ? "Enquiry accepted for discussion and reply sent. The accounts are not linked."
          : "Reply sent. The accounts are still not linked."
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not send reply.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (enquiry: MarketplaceEnquiry) => {
    setBusyId(enquiry.id);
    try {
      await respondToMarketplaceEnquiry({ enquiryId: enquiry.id, decision: "declined" });
      await load();
      showToast("Enquiry declined. No relationship or private access was created.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not decline enquiry.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const confirmCustomerAgreement = async (enquiry: MarketplaceEnquiry) => {
    setBusyId(enquiry.id);
    try {
      await confirmMarketplaceEnquiryCustomerAgreement(enquiry.id);
      setConfirmation(null);
      await load();
      showToast("You confirmed that you are ready to proceed. The designer must still finalise it.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not confirm agreement.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDesignerAgreement = async (enquiry: MarketplaceEnquiry) => {
    setBusyId(enquiry.id);
    try {
      await confirmMarketplaceEnquiryAgreement(enquiry.id);
      setConfirmation(null);
      await Promise.all([load(), refreshAppData()]);
      showToast(
        `${enquiry.customerName} is now linked to your atelier. No project was created automatically.`
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not finalise agreement.", "error");
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
              ? "Discuss the request here first. Link the client only after they confirm the latest agreement."
              : "Discuss the request without sharing measurements, project files, or private collaboration data."}
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
            const messages = messagesByEnquiry[enquiry.id] ?? [];
            const busy = busyId === enquiry.id;
            const canAcceptForDiscussion = marketplaceEnquiryCanBeAnswered(enquiry);
            const canDiscuss = marketplaceEnquiryCanBeDiscussed(enquiry);
            const canCustomerConfirm = marketplaceEnquiryCanConfirmCustomerAgreement(
              enquiry,
              messages
            );
            const canLink = marketplaceEnquiryCanBeLinked(enquiry);
            const statusLabel =
              status === "pending" && role === "designer"
                ? "New enquiry"
                : marketplaceEnquiryStatusLabel[status];
            const confirmationForEnquiry =
              confirmation?.enquiryId === enquiry.id ? confirmation.action : null;

            return (
              <article
                key={enquiry.id}
                className="rounded-2xl border border-primary/10 bg-card p-5 shadow-warm lg:p-7"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant[status]}>{statusLabel}</Badge>
                      {enquiry.customerAgreedAt && status === "pending" && (
                        <Badge variant="gold">Client ready</Badge>
                      )}
                      <span className="text-xs text-primary/45">
                        Sent {formatDate(enquiry.createdAt)}
                      </span>
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
                    <dd className="mt-1 font-medium text-primary">
                      {enquiry.budget ?? "Not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-primary/45">
                      Consultation
                    </dt>
                    <dd className="mt-1 font-medium capitalize text-primary">
                      {enquiry.consultationPreference ?? "No preference"}
                    </dd>
                  </div>
                </dl>

                {enquiry.designerResponse && status === "declined" && (
                  <p className="mt-4 rounded-xl border border-primary/10 px-4 py-3 text-sm text-primary/70">
                    <span className="font-semibold text-primary">Designer response: </span>
                    {enquiry.designerResponse}
                  </p>
                )}

                <section className="mt-6 border-t border-primary/10 pt-5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-accent" />
                    <h3 className="text-sm font-semibold text-primary">Enquiry conversation</h3>
                    <span className="text-xs text-primary/45">
                      {status === "accepted" ? "Accounts linked" : "Accounts are not linked"}
                    </span>
                  </div>

                  {messages.length === 0 ? (
                    <p className="mt-4 rounded-xl bg-background px-4 py-3 text-sm text-primary/55">
                      {role === "designer"
                        ? "Reply to discuss availability, price, timing, fittings, or other details."
                        : "The designer has not replied yet."}
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3" aria-label="Enquiry messages">
                      {messages.map((message) => {
                        const isOwnMessage = message.senderRole === role;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                                isOwnMessage
                                  ? "bg-primary text-background"
                                  : "border border-primary/10 bg-background text-primary"
                              }`}
                            >
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs opacity-70">
                                <span className="font-semibold">{message.senderName}</span>
                                <span>{formatMessageTime(message.createdAt)}</span>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{message.body}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(canDiscuss || (role === "designer" && canAcceptForDiscussion)) && (
                    <div className="mt-5 rounded-xl border border-primary/10 bg-background p-4">
                      <TextArea
                        id={`enquiry-reply-${enquiry.id}`}
                        label={
                          canAcceptForDiscussion
                            ? "Reply to accept this enquiry for discussion"
                            : "Reply to this enquiry"
                        }
                        rows={3}
                        maxLength={2000}
                        placeholder="Discuss the request without sharing private contact details or measurements."
                        value={drafts[enquiry.id] ?? ""}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [enquiry.id]: event.target.value,
                          }))
                        }
                      />
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-primary/45">
                          {canAcceptForDiscussion
                            ? "Accepting for discussion does not link the accounts."
                            : "Sending a reply does not link the accounts."}
                        </p>
                        <Button
                          size="sm"
                          disabled={busy || !(drafts[enquiry.id]?.trim())}
                          onClick={() => void sendReply(enquiry)}
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          {canAcceptForDiscussion ? "Accept & send reply" : "Send reply"}
                        </Button>
                      </div>
                    </div>
                  )}
                </section>

                {confirmationForEnquiry && (
                  <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-sm font-semibold">
                          {confirmationForEnquiry === "customer-agreement"
                            ? "Confirm that you agree to proceed"
                            : "Confirm the agreement and link this client"}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                          {confirmationForEnquiry === "customer-agreement"
                            ? "This tells the designer that the latest terms discussed here are acceptable. Your accounts are not linked until the designer confirms too."
                            : "This creates an active client–designer relationship. It does not create a project; you will do that separately afterward."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void (confirmationForEnquiry === "customer-agreement"
                                ? confirmCustomerAgreement(enquiry)
                                : confirmDesignerAgreement(enquiry))
                            }
                          >
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => setConfirmation(null)}
                          >
                            Go back
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-primary/10 pt-5">
                  {role === "designer" && (canAcceptForDiscussion || canDiscuss) && (
                    <>
                      {canLink ? (
                        <Button
                          disabled={busy}
                          onClick={() =>
                            setConfirmation({
                              enquiryId: enquiry.id,
                              action: "designer-link",
                            })
                          }
                        >
                          <Check className="h-4 w-4" />
                          Confirm agreement &amp; link client
                        </Button>
                      ) : canDiscuss ? (
                        <p className="text-xs text-primary/50">
                          Reply and wait for the client to confirm the latest discussion before linking.
                        </p>
                      ) : null}
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => void decline(enquiry)}
                      >
                        <X className="h-4 w-4" />
                        Decline enquiry
                      </Button>
                    </>
                  )}
                  {role === "customer" && (canAcceptForDiscussion || canDiscuss) && (
                    <>
                      {canCustomerConfirm && (
                        <Button
                          disabled={busy}
                          onClick={() =>
                            setConfirmation({
                              enquiryId: enquiry.id,
                              action: "customer-agreement",
                            })
                          }
                        >
                          <Check className="h-4 w-4" />
                          Confirm I&apos;m ready to proceed
                        </Button>
                      )}
                      {enquiry.customerAgreedAt && (
                        <p className="text-xs font-medium text-accent">
                          You confirmed the latest discussion. Waiting for the designer to finalise it.
                        </p>
                      )}
                      {marketplaceEnquiryCanBeCancelled(enquiry) && (
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void cancel(enquiry)}
                        >
                          Cancel enquiry
                        </Button>
                      )}
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
                  {(status === "pending" || status === "discussing") && (
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
