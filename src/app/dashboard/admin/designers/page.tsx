import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminDesignersTable } from "@/components/admin/AdminDesignersTable";

export default function AdminDesignersPage() {
  return (
    <AdminPageLayout
      title="Designers"
      description="Manage designer businesses, specialties, and account status."
      mobileTitle="Designers"
    >
      <AdminDesignersTable />
    </AdminPageLayout>
  );
}
