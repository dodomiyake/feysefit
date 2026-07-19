import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminDesignerDetailView } from "@/components/admin/AdminDesignerDetailView";

export default async function AdminDesignerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminPageLayout
      title="Designer profile"
      description="View business details, linked clients, and project activity."
      mobileTitle="Designer"
      backHref="/dashboard/admin/designers"
      backLabel="Back to designers"
    >
      <AdminDesignerDetailView designerId={id} />
    </AdminPageLayout>
  );
}
