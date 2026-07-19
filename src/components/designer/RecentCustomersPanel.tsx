"use client";

import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { getCustomerSubtitle } from "@/lib/customer-display";
import { customerMessageThreadHref } from "@/lib/message-links";
import { ClientActionsMenu } from "@/components/designer/ClientActionsMenu";
import { CustomerAvatar } from "@/components/ui/CustomerAvatar";
import { MessageSquare } from "lucide-react";

export function RecentCustomersPanel() {
  const { customers, projects } = useApp();

  return (
    <section className="rounded-xl bg-surface-container p-6">
      <h2 className="font-headline text-lg font-semibold text-primary">Recent Clients</h2>
      <div className="mt-6 space-y-6">
        {customers.length === 0 ? (
          <p className="text-sm text-primary/50">No clients linked yet.</p>
        ) : (
          customers.slice(0, 3).map((customer) => (
          <div key={customer.id} className="flex items-center gap-3">
            <CustomerAvatar
              name={customer.name}
              profileImage={customer.profileImage}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/clients/${encodeURIComponent(customer.id)}`}
                className="truncate text-sm font-semibold text-primary hover:underline"
              >
                {customer.name}
              </Link>
              <p className="truncate text-xs text-primary/50">
                {getCustomerSubtitle(customer, projects)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={customerMessageThreadHref(customer.id, projects)}
                className="rounded-full p-2 text-primary/40 transition-colors hover:bg-background hover:text-accent"
                aria-label={`Message ${customer.name}`}
              >
                <MessageSquare className="h-4 w-4" />
              </Link>
              <ClientActionsMenu customer={customer} projects={projects} />
            </div>
          </div>
        )))}
      </div>
      <Link href="/clients">
        <button
          type="button"
          className="mt-6 w-full rounded-full border border-zinc-800 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
        >
          Browse Client Database
        </button>
      </Link>
    </section>
  );
}
