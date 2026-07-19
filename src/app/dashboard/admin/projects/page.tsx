import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminProjectsTable } from "@/components/admin/AdminProjectsTable";

export default function AdminProjectsPage() {
  return (
    <AdminPageLayout
      title="Projects"
      description="Monitor commissions, budgets, and project status across the platform."
      mobileTitle="Projects"
    >
      <AdminProjectsTable limit={null} showFilters />
    </AdminPageLayout>
  );
}
