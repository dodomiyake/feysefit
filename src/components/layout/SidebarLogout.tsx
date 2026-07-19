"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { sidebarLogoutClass } from "./AppSidebar";
import { cn } from "@/lib/cn";

export function SidebarLogout({ className }: { className?: string }) {
  const router = useRouter();
  const { logout } = useApp();

  const handleLogout = () => {
    void logout().then(() => {
      router.replace("/login");
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={cn(sidebarLogoutClass, className)}
    >
      <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
      Log out
    </button>
  );
}
