import { AppShell } from "@/components/layout/AppShell";
import { MarketplaceEnquiriesView } from "@/components/marketplace/MarketplaceEnquiriesView";

export default function EnquiriesPage() {
  return (
    <AppShell mobileTitle="Enquiries" showMobileTopBar>
      <MarketplaceEnquiriesView />
    </AppShell>
  );
}
