import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminRouteGuard>{children}</AdminRouteGuard>;
}
