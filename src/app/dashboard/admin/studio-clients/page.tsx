import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStudioClientsTable } from "@/components/admin/AdminStudioClientsTable";

export default function AdminStudioClientsPage() {
  return (
    <AdminPageLayout
      title="Studio clients"
      description="Walk-in and in-studio clients that designers manage outside the app client directory."
      backHref="/dashboard/admin"
      backLabel="Back to dashboard"
    >
      <AdminStudioClientsTable />
    </AdminPageLayout>
  );
}
