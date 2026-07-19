import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminCustomerDetailView } from "@/components/admin/AdminCustomerDetailView";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminPageLayout
      title="Client profile"
      description="View account details, designer link status, and projects."
      mobileTitle="Client"
      backHref="/dashboard/admin/customers"
      backLabel="Back to clients"
    >
      <AdminCustomerDetailView customerId={id} />
    </AdminPageLayout>
  );
}
