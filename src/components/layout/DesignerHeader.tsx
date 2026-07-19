"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";
import { NotificationButton } from "@/components/ui/NotificationButton";
import { useApp } from "@/context/AppContext";
import { DEMO_DESIGNER_ID } from "@/lib/customer-access";
import { isSupabaseEnabled } from "@/lib/config/backend";

export function DesignerHeader() {
  const { authUser, getDesignerById } = useApp();
  const designer =
    (authUser?.designerId ? getDesignerById(authUser.designerId) : undefined) ??
    (!isSupabaseEnabled() ? getDesignerById(DEMO_DESIGNER_ID) : undefined);
  const displayName = designer?.designerName ?? authUser?.name ?? "Designer";

  if (!designer && !authUser) {
    return (
      <header className="fixed top-0 right-0 z-40 hidden h-16 w-full items-center justify-between gap-6 border-b border-primary/10 bg-background/90 px-5 backdrop-blur-md lg:flex lg:w-[calc(100%-16rem)] lg:px-12" />
    );
  }

  return (
    <header className="fixed top-0 right-0 z-40 hidden h-16 w-full items-center justify-between gap-6 border-b border-primary/10 bg-background/90 px-5 backdrop-blur-md lg:flex lg:w-[calc(100%-16rem)] lg:px-12">
      <div className="flex max-w-xl flex-1 items-center gap-3 rounded-full border border-primary/10 bg-surface-container/80 px-4 py-2 transition-all focus-within:ring-1 focus-within:ring-accent">
        <Search className="h-[18px] w-[18px] shrink-0 text-primary/40" />
        <input
          type="search"
          placeholder="Search orders, clients..."
          className="w-full bg-transparent text-sm text-primary placeholder:text-primary/40 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-6">
        <NotificationButton />
        <Link
          href="/marketplace"
          className="rounded-full p-2 text-primary transition-colors hover:bg-primary/5"
          aria-label="Marketplace"
        >
          <ShoppingBag className="h-5 w-5" />
        </Link>
        <Link href="/settings" className="transition-opacity hover:opacity-80">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-primary/10">
            {designer?.profileImage ? (
              <Image
                src={designer.profileImage}
                alt={displayName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-surface-container text-sm font-semibold text-primary">
                {displayName.charAt(0)}
              </div>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}
