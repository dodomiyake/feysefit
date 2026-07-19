import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminReportedUsers } from "@/components/admin/AdminReportedUsers";

export default function AdminReportedUsersPage() {
  return (
    <AdminPageLayout
      title="Reported Users"
      description="Review moderation cases, suspend accounts, or dismiss reports."
      mobileTitle="Reports"
    >
      <AdminReportedUsers />
    </AdminPageLayout>
  );
}
