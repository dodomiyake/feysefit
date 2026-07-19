import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminCustomersGrid } from "@/components/admin/AdminCustomersGrid";

export default function AdminCustomersPage() {
  return (
    <AdminPageLayout
      title="Clients"
      description="Browse the client directory and project activity."
      mobileTitle="Clients"
    >
      <AdminCustomersGrid />
    </AdminPageLayout>
  );
}
