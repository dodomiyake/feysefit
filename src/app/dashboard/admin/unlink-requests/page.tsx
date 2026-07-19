import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminUnlinkRequests } from "@/components/admin/AdminUnlinkRequests";

export default function AdminUnlinkRequestsPage() {
  return (
    <AdminPageLayout
      title="Unlink Requests"
      description="Review client requests to end designer relationships and coordinate confirmations."
      mobileTitle="Unlink"
    >
      <AdminUnlinkRequests />
    </AdminPageLayout>
  );
}
