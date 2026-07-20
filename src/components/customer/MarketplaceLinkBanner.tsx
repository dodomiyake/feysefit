import Link from "next/link";
import { Link2 } from "lucide-react";
import { LINKED_DESIGNER_PAGE_HREF } from "@/lib/customer-designer-links";

export function MarketplaceLinkBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-accent/20 bg-highlight/10 px-4 py-3 text-sm text-primary lg:mb-8">
      <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <p className="text-primary/70">
        You&apos;re privately linked to your designer.{" "}
        <Link href={LINKED_DESIGNER_PAGE_HREF} className="font-medium text-accent hover:underline">
          Book appointments
        </Link>{" "}
        on their profile page. Marketplace browsing stays unavailable while you are linked — request an
        unlink from Settings if you need marketplace access.
      </p>
    </div>
  );
}
