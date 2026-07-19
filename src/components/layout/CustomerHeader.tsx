"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getCustomerInitials, resolveCurrentCustomer } from "@/lib/customer-display";
import { getCustomerAccountLabel } from "@/lib/customer-access";
import { NotificationButton } from "@/components/ui/NotificationButton";

function CustomerHeaderInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authUser, customers, customerLink } = useApp();
  const customer = resolveCurrentCustomer(customers, authUser);
  const displayName = customer?.name ?? authUser?.name ?? "Client";
  const isMarketplace = pathname.startsWith("/marketplace");
  const searchFromUrl = isMarketplace ? (searchParams.get("q") ?? "") : "";
  const [searchValue, setSearchValue] = useState(searchFromUrl);
  const [prevSearchFromUrl, setPrevSearchFromUrl] = useState(searchFromUrl);

  if (searchFromUrl !== prevSearchFromUrl) {
    setPrevSearchFromUrl(searchFromUrl);
    setSearchValue(searchFromUrl);
  }

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (!isMarketplace) return;
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    const query = params.toString();
    router.replace(query ? `/marketplace?${query}` : "/marketplace", { scroll: false });
  };

  return (
    <header className="fixed top-0 right-0 z-40 hidden h-16 w-full items-center justify-between gap-6 border-b border-primary/10 bg-background/90 px-5 backdrop-blur-md lg:flex lg:w-[calc(100%-16rem)] lg:px-12">
      <div className="flex max-w-xl flex-1 items-center gap-3 rounded-full border border-primary/10 bg-surface-container/80 px-4 py-2 transition-all focus-within:ring-1 focus-within:ring-accent">
        <Search className="h-[18px] w-[18px] shrink-0 text-primary/40" />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={
            isMarketplace
              ? "Search artisans, styles, or ateliers..."
              : "Search orders, designers..."
          }
          className="w-full bg-transparent text-sm text-primary placeholder:text-primary/40 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-6">
        <NotificationButton />
        <Link
          href="/settings"
          className="flex items-center gap-3 border-l border-primary/10 pl-6 transition-opacity hover:opacity-80"
        >
          <div className="text-right">
            <p className="text-sm font-medium text-primary">{displayName}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/45">
              {getCustomerAccountLabel(customerLink)}
            </p>
          </div>
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-primary/10 bg-card text-xs font-semibold text-primary">
            {customer?.profileImage ? (
              <Image
                src={customer.profileImage}
                alt={displayName}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              getCustomerInitials(displayName)
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}

export function CustomerHeader() {
  return (
    <Suspense fallback={null}>
      <CustomerHeaderInner />
    </Suspense>
  );
}
