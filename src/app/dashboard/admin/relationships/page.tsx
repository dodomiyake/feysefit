import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminRelationshipsView } from "@/components/admin/AdminRelationshipsView";

export default function AdminRelationshipsPage() {
  return (
    <AdminPageLayout
      title="Relationships"
      description="View designer–client links, registration paths, and shared project activity."
      mobileTitle="Relationships"
    >
      <AdminRelationshipsView />
    </AdminPageLayout>
  );
}
