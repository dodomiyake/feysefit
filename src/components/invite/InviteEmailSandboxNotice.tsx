"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";

export function InviteEmailSandboxNotice() {
  const [sandbox, setSandbox] = useState(false);

  useEffect(() => {
    void fetch("/api/v1/invites/email-config")
      .then((response) => response.json())
      .then((payload: { data?: { sandbox?: boolean } }) => {
        setSandbox(Boolean(payload.data?.sandbox));
      })
      .catch(() => undefined);
  }, []);

  if (!sandbox) return null;

  return (
    <div className="mb-6 flex gap-3 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <Mail className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium">Resend test mode is on</p>
        <p className="leading-relaxed text-amber-900/90">
          Emails can only be delivered to your own Resend account address while using{" "}
          <span className="font-mono text-xs">onboarding@resend.dev</span>. To invite real
          clients by email, verify{" "}
          <a
            href="https://resend.com/domains"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2"
          >
            feysefit.com on Resend
          </a>{" "}
          and set <span className="font-mono text-xs">INVITE_EMAIL_FROM</span> to e.g.{" "}
          <span className="font-mono text-xs">invites@feysefit.com</span>. You can always copy the
          invitation link and share it manually.
        </p>
      </div>
    </div>
  );
}
