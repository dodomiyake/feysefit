import Link from "next/link";
import { ExternalLink, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function AdminMarketplacePreviewLink() {
  return (
    <Link href="/marketplace" target="_blank" rel="noopener noreferrer">
      <Button type="button" variant="secondary" size="sm" className="gap-2">
        <Store className="h-4 w-4" />
        Preview live marketplace
        <ExternalLink className="h-3.5 w-3.5 opacity-60" />
      </Button>
    </Link>
  );
}
