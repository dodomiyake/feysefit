import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminTeamAccess } from "@/components/admin/AdminTeamAccess";

export default function AdminTeamPage() {
  return (
    <AdminPageLayout
      title="Admin team"
      description="Grant or revoke admin portal access for employees who help manage the platform."
      mobileTitle="Admin team"
    >
      <AdminTeamAccess />
    </AdminPageLayout>
  );
}
