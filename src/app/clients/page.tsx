"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DesignerShell } from "@/components/layout/DesignerShell";
import { TopBar } from "@/components/layout/TopBar";
import { DesktopBackNav } from "@/components/ui/BackButton";
import { ClientsCompactList } from "@/components/designer/ClientsCompactList";
import { useApp } from "@/context/AppContext";
import { Search, UserPlus, Users } from "lucide-react";

type ClientTab = "app" | "studio";

export default function ClientsPage() {
  const { customers, studioClients } = useApp();
  const [tab, setTab] = useState<ClientTab>("app");
  const [query, setQuery] = useState("");

  const filteredApp = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(normalized) ||
        customer.location.toLowerCase().includes(normalized) ||
        customer.phone.toLowerCase().includes(normalized) ||
        customer.email.toLowerCase().includes(normalized)
    );
  }, [customers, query]);

  const filteredStudio = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return studioClients;
    return studioClients.filter(
      (client) =>
        client.name.toLowerCase().includes(normalized) ||
        client.location.toLowerCase().includes(normalized) ||
        client.phone.toLowerCase().includes(normalized) ||
        client.email.toLowerCase().includes(normalized)
    );
  }, [studioClients, query]);

  const activeList = tab === "app" ? filteredApp : filteredStudio;

  return (
    <DesignerShell mobileTitle="Clients" showMobileTopBar={false}>
      <TopBar title="Clients" showBack backHref="/dashboard/designer" />
      <div className="mx-auto w-full max-w-none px-5 pb-10 pt-6 lg:px-10 lg:pb-12 xl:px-12">
        <DesktopBackNav href="/dashboard/designer" label="Back to dashboard" />
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary lg:text-[1.75rem]">
              Client Database
            </h1>
            <p className="mt-2 text-sm text-primary/60 lg:text-base">
              <span className="font-medium text-primary/80">App clients</span> have FeyseFit
              accounts (login in Supabase).{" "}
              <span className="font-medium text-primary/80">Studio clients</span> are private
              walk-ins owned by you — no app login, and they will not appear in Supabase Auth.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tab === "app" ? (
              <Link
                href="/invite"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <UserPlus className="h-4 w-4" />
                Invite Client
              </Link>
            ) : (
              <Link
                href="/clients/studio/new"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Users className="h-4 w-4" />
                Add Walk-In Client
              </Link>
            )}
          </div>
        </div>

        <div className="mb-6 flex gap-2">
          {([
            { id: "app" as const, label: "App clients" },
            { id: "studio" as const, label: "Studio clients (local)" },
          ]).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === item.id ? "bg-primary text-white" : "border border-primary/15 text-primary"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mb-8 flex max-w-md items-center gap-3 rounded-full border border-primary/10 bg-surface-container/80 px-4 py-2">
          <Search className="h-4 w-4 shrink-0 text-primary/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, location, phone, or email..."
            className="w-full bg-transparent text-sm text-primary placeholder:text-primary/40 focus:outline-none"
          />
        </div>

        {activeList.length === 0 ? (
          <div className="rounded-xl bg-surface-container p-10 text-center">
            <p className="font-medium text-primary">
              {tab === "app"
                ? customers.length === 0
                  ? "No linked app clients yet"
                  : "No app clients match your search"
                : studioClients.length === 0
                  ? "No studio clients yet"
                  : "No studio clients match your search"}
            </p>
            <p className="mt-1 text-sm text-primary/55">
              {tab === "app"
                ? "Invite a client from the invite page. They appear here after accepting and creating an account."
                : "Add walk-in clients for in-person work. They stay local to your studio and never get a FeyseFit login."}
            </p>
          </div>
        ) : (
          <ClientsCompactList
            tab={tab}
            appClients={filteredApp}
            studioClients={filteredStudio}
            resetKey={`${tab}|${query}`}
          />
        )}
      </div>
    </DesignerShell>
  );
}
