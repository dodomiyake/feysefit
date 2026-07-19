import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function InviteBreadcrumb() {
  return (
    <nav className="mb-4 flex items-center gap-2 text-sm text-ink-muted" aria-label="Breadcrumb">
      <Link href="/clients" className="transition-colors hover:text-primary">
        Clients
      </Link>
      <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
      <span className="font-medium text-primary">Invite Client</span>
    </nav>
  );
}
