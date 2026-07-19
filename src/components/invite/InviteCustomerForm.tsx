"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { InviteProjectTypeTiles } from "@/components/invite/InviteProjectTypeTiles";
import { InviteLinkCopy } from "@/components/invite/InviteLinkCopy";
import type { InviteProjectType } from "@/lib/invite-types";
import type { PendingInvite } from "@/lib/mock-data";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { buildInviteJoinUrl } from "@/lib/invite-link";
import {
  createInvite,
  resolveCustomerEmailFromContact,
  sendInviteEmailNotification,
} from "@/lib/services/inviteService";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

const fieldClass =
  "signup-field w-full rounded-lg border px-4 py-3 text-primary placeholder:text-primary/40 outline-none focus:outline-none";

type SendState = "idle" | "sending" | "sent";

interface InviteCustomerFormProps {
  onInviteCreated?: (invite: PendingInvite) => void;
}

export function InviteCustomerForm({ onInviteCreated }: InviteCustomerFormProps) {
  const { showToast, authUser } = useApp();
  const useSupabase = isSupabaseEnabled();
  const formRef = useRef<HTMLFormElement>(null);
  const [projectType, setProjectType] = useState<InviteProjectType>("bespoke");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [lastInvite, setLastInvite] = useState<PendingInvite | null>(null);

  const handleDraft = () => {
    showToast("Invitation saved as draft");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sendState !== "idle") return;

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "");
    const contact = String(form.get("contact") ?? "");
    const message = String(form.get("message") ?? "");
    const customerEmail = resolveCustomerEmailFromContact(contact);

    if (!customerEmail) {
      showToast("Enter a valid client email address to send the invitation.", "error");
      return;
    }

    setSendState("sending");
    setLastInvite(null);

    const finish = (invite?: PendingInvite, emailSent = false) => {
      if (invite) {
        setLastInvite(invite);
        onInviteCreated?.(invite);
      }
      setSendState("sent");
      showToast(
        emailSent
          ? `Invitation email sent to ${customerEmail}`
          : "Invitation created — share the link with your client"
      );
      window.setTimeout(() => {
        setSendState("idle");
        formRef.current?.reset();
        setProjectType("bespoke");
      }, 2000);
    };

    const deliverInvite = async (invite: PendingInvite) => {
      try {
        await sendInviteEmailNotification({
          inviteId: invite.id,
          customerEmail,
          customerName: name,
          projectType,
          inviteCode: invite.code,
          personalMessage: message,
        });
        finish(invite, true);
      } catch (error) {
        finish(invite, false);
        showToast(
          error instanceof Error
            ? error.message
            : "Invite created, but the email could not be sent. Copy the link below.",
          "error"
        );
      }
    };

    if (useSupabase) {
      if (!authUser?.designerId) {
        showToast("Designer profile not found. Please sign in again.", "error");
        setSendState("idle");
        return;
      }
      void createInvite({
        designerLegacyId: authUser.designerId,
        name,
        email: customerEmail,
        projectType: projectType,
      })
        .then((invite) => deliverInvite(invite))
        .catch((error) => {
          setSendState("idle");
          showToast(error instanceof Error ? error.message : "Invite failed", "error");
        });
      return;
    }

    const demoInvite: PendingInvite = {
      id: crypto.randomUUID(),
      code: `FF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      name,
      email: customerEmail,
      projectType,
      sentAt: new Date().toLocaleDateString("en-GB"),
      sentAgo: "Just now",
      status: "pending",
    };
    window.setTimeout(() => {
      finish(demoInvite, false);
      showToast("Demo invite created. Enable Supabase and Resend to send real invitation emails.");
    }, 1200);
  };

  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm lg:p-8">
      {lastInvite && (
        <div className="mb-6 rounded-lg border border-accent/25 bg-accent/5 p-4">
          <p className="text-sm font-medium text-primary">
            Invitation ready for {lastInvite.name}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Share this link so they can create their account and connect with you.
          </p>
          <div className="mt-4">
            <InviteLinkCopy url={buildInviteJoinUrl(lastInvite.code)} />
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            Invite code: <span className="font-mono font-medium text-primary">{lastInvite.code}</span>
          </p>
        </div>
      )}

      <form ref={formRef} className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="invite-name" className="block px-1 text-sm font-medium text-ink-muted">
              Full Name
            </label>
            <input
              id="invite-name"
              name="name"
              type="text"
              required
              placeholder="e.g. Jane Smith"
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="invite-contact" className="block px-1 text-sm font-medium text-ink-muted">
              Client email
            </label>
            <input
              id="invite-contact"
              name="contact"
              type="email"
              required
              placeholder="hello@client.com"
              className={fieldClass}
            />
          </div>
        </div>

        <InviteProjectTypeTiles value={projectType} onChange={setProjectType} />

        <div className="space-y-2">
          <label htmlFor="invite-message" className="block px-1 text-sm font-medium text-ink-muted">
            Personal Message (Optional)
          </label>
          <textarea
            id="invite-message"
            name="message"
            rows={6}
            placeholder="Write a welcoming note to your client..."
            className={cn(fieldClass, "resize-none")}
          />
          <p className="px-1 text-xs italic text-ink-muted">
            This message is included in the invitation email sent to your client.
          </p>
        </div>

        <div className="flex flex-col-reverse items-stretch justify-between gap-4 pt-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleDraft}
            className="text-sm font-medium text-ink-muted underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            Save as Draft
          </button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={sendState !== "idle"}
            className={cn(
              "gap-2 sm:min-w-[200px]",
              sendState === "sent" && "bg-emerald-600 hover:bg-emerald-600"
            )}
          >
            {sendState === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
            {sendState === "sent" && <CheckCircle2 className="h-4 w-4" />}
            {sendState === "idle" && "Send Invitation Email"}
            {sendState === "sending" && "Sending..."}
            {sendState === "sent" && "Email Sent"}
          </Button>
        </div>
      </form>
    </section>
  );
}
