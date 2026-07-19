import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminTestimonialsTable } from "@/components/admin/AdminTestimonialsTable";

export default function AdminTestimonialsPage() {
  return (
    <AdminPageLayout
      title="Testimonials"
      description="Review client testimonials, moderate reported reviews, and remove inappropriate content."
      mobileTitle="Testimonials"
    >
      <AdminTestimonialsTable />
    </AdminPageLayout>
  );
}
