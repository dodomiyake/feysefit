"use client";

import Image from "next/image";
import Link from "next/link";
import { NotificationButton } from "@/components/ui/NotificationButton";
import { AdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";
import { useApp } from "@/context/AppContext";

export function AdminHeader() {
  const { authUser } = useApp();
  const displayName = authUser?.name ?? "Admin";
  const avatar = authUser?.profileImage?.trim();

  return (
    <header className="fixed top-0 right-0 z-40 hidden h-16 w-full items-center justify-between gap-6 border-b border-primary/10 bg-background/90 px-5 backdrop-blur-md lg:flex lg:w-[calc(100%-16rem)] lg:px-12">
      <AdminGlobalSearch />

      <div className="flex items-center gap-6">
        <NotificationButton />
        <div className="flex items-center gap-3 border-l border-primary/10 pl-6">
          <div className="text-right">
            <p className="text-sm font-medium text-primary">{displayName}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/45">
              Superuser
            </p>
          </div>
          <Link href="/settings" className="shrink-0 transition-opacity hover:opacity-80">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-primary/10 bg-card">
              {avatar ? (
                <Image src={avatar} alt={displayName} fill className="object-cover" sizes="40px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
                  {displayName.charAt(0)}
                </div>
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
