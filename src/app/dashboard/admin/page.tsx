import { AppShell } from "@/components/layout/AppShell";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

export default function AdminDashboardPage() {
  return (
    <AppShell mobileTitle="Admin Dashboard" showMobileTopBar>
      <div className="mx-auto w-full max-w-none flex-1 px-5 pb-10 pt-6 lg:px-10 lg:pb-12 xl:px-12">
        <AdminDashboardClient />
      </div>
      <SiteFooter showOnMobile />
    </AppShell>
  );
}
