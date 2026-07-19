"use client";

import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { AdminRealtimeSync } from "./AdminRealtimeSync";
import { AdminDesktopOnlyGate } from "./AdminDesktopOnlyGate";
import { Toast } from "@/components/ui/Toast";

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <AdminDesktopOnlyGate>
      <AdminRealtimeSync />
      <AdminSidebar />
      <div className="lg:pl-64">
        <AdminHeader />
        <main className="flex min-h-screen flex-col lg:pt-16">{children}</main>
      </div>
      <Toast />
    </AdminDesktopOnlyGate>
  );
}
