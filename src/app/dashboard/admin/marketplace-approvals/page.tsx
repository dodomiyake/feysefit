import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminMarketplaceApprovals } from "@/components/admin/AdminMarketplaceApprovals";
import { AdminMarketplacePreviewLink } from "@/components/admin/AdminMarketplacePreviewLink";

export default function AdminMarketplaceApprovalsPage() {
  return (
    <AdminPageLayout
      title="Marketplace Approvals"
      description="Open each request to verify identity, portfolio, and account history before approving."
      mobileTitle="Approvals"
      headerAction={<AdminMarketplacePreviewLink />}
    >
      <AdminMarketplaceApprovals />
    </AdminPageLayout>
  );
}
