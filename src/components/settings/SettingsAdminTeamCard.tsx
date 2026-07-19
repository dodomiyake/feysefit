"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function SettingsAdminTeamCard() {
  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md lg:col-span-5 lg:p-8">
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-lg bg-accent/15 p-2 text-accent">
          <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="font-headline text-xl font-semibold text-primary">Admin team</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Grant or revoke admin portal access for employees who help run FeyseFit.
          </p>
        </div>
      </div>

      <Link
        href="/dashboard/admin/team"
        className="inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:underline"
      >
        Manage admin team
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
