import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminAppointmentsTable } from "@/components/admin/AdminAppointmentsTable";

export default function AdminAppointmentsPage() {
  return (
    <AdminPageLayout
      title="Appointments"
      description="Scheduled fittings, consultations, and client booking requests across all designers."
      backHref="/dashboard/admin"
      backLabel="Back to dashboard"
    >
      <AdminAppointmentsTable />
    </AdminPageLayout>
  );
}
