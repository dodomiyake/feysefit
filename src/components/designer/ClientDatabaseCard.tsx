import Link from "next/link";
import type { Customer, Project } from "@/lib/mock-data";
import { getCustomerSubtitle, customerProjectsHref } from "@/lib/customer-display";
import { customerMessageThreadHref } from "@/lib/message-links";
import { useApp } from "@/context/AppContext";
import { CustomerAvatar } from "@/components/ui/CustomerAvatar";
import { MapPin, Mail, MessageSquare, FolderKanban, Ruler, Phone } from "lucide-react";

export function ClientDatabaseCard({ customer }: { customer: Customer }) {
  const { projects } = useApp();

  return (
    <div className="rounded-xl bg-surface-container p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <CustomerAvatar
          name={customer.name}
          profileImage={customer.profileImage}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-headline text-lg font-semibold text-primary">{customer.name}</h3>
          <p className="mt-0.5 text-sm text-primary/55">
            {getCustomerSubtitle(customer, projects, { includeLocation: false }) || "App client"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">
          {customer.projectCount} {customer.projectCount === 1 ? "project" : "projects"}
        </span>
      </div>

      <div className="mt-4 space-y-1.5 text-sm text-primary/60">
        {customer.location && (
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/40" />
            {customer.location}
          </p>
        )}
        {customer.phone && (
          <p className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-primary/40" />
            {customer.phone}
          </p>
        )}
        <p className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 shrink-0 text-primary/40" />
          {customer.email}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/clients/${encodeURIComponent(customer.id)}`}
          className="flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-full border border-primary/10 bg-card py-2.5 text-sm font-medium text-primary transition-colors hover:border-zinc-800 hover:bg-zinc-900 hover:text-white"
        >
          View profile
        </Link>
        <Link
          href={`/clients/measurements?customer=${encodeURIComponent(customer.id)}`}
          className="flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-full border border-primary/10 bg-card py-2.5 text-sm font-medium text-primary transition-colors hover:border-zinc-800 hover:bg-zinc-900 hover:text-white"
        >
          <Ruler className="h-4 w-4" />
          Measurements
        </Link>
        <Link
          href={customerMessageThreadHref(customer.id, projects)}
          className="flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-full border border-primary/10 bg-card py-2.5 text-sm font-medium text-primary transition-colors hover:border-zinc-800 hover:bg-zinc-900 hover:text-white"
        >
          <MessageSquare className="h-4 w-4" />
          Message
        </Link>
        <Link
          href={customerProjectsHref(customer.id, projects)}
          className="flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-full border border-primary/10 bg-card py-2.5 text-sm font-medium text-primary transition-colors hover:border-zinc-800 hover:bg-zinc-900 hover:text-white"
        >
          <FolderKanban className="h-4 w-4" />
          Projects
        </Link>
      </div>
    </div>
  );
}
