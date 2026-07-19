import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminMarketplaceReview } from "@/components/admin/AdminMarketplaceReview";

export default async function AdminMarketplaceReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminPageLayout
      title="Verify designer listing"
      description="Review identity, portfolio, and account history before approving marketplace access."
      mobileTitle="Verify"
      backHref="/dashboard/admin/marketplace-approvals"
      backLabel="Back to approvals"
    >
      <AdminMarketplaceReview approvalId={id} />
    </AdminPageLayout>
  );
}
