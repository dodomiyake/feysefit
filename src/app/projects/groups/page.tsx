"use client";

import Link from "next/link";
import { DesignerShell } from "@/components/layout/DesignerShell";
import { TopBar } from "@/components/layout/TopBar";
import { DesktopBackNav } from "@/components/ui/BackButton";
import { useApp } from "@/context/AppContext";
import { GROUP_EVENT_TYPE_OPTIONS } from "@/lib/local-customer";
import { Users } from "lucide-react";

export default function GroupProjectsPage() {
  const { groupProjects } = useApp();

  return (
    <DesignerShell mobileTitle="Group orders" showMobileTopBar={false}>
      <TopBar title="Group Orders" showBack backHref="/projects" />
      <div className="mx-auto max-w-5xl px-5 pb-12 pt-6 lg:px-16">
        <DesktopBackNav href="/projects" label="Back to projects" />
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary">Group & Aso-Ebi Orders</h1>
            <p className="mt-2 text-sm text-primary/60">
              Coordinate weddings, aso-ebi, family outfits, and events with multiple members.
            </p>
          </div>
          <Link
            href="/projects/groups/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            <Users className="h-4 w-4" />
            New group order
          </Link>
        </div>

        {groupProjects.length === 0 ? (
          <div className="rounded-xl bg-surface-container p-10 text-center text-primary/60">
            No group orders yet. Create one for weddings, aso-ebi, or family events.
          </div>
        ) : (
          <div className="space-y-3">
            {groupProjects.map((group) => {
              const eventLabel =
                GROUP_EVENT_TYPE_OPTIONS.find((option) => option.value === group.eventType)
                  ?.label ?? group.eventType;
              return (
                <Link
                  key={group.id}
                  href={`/projects/groups/${encodeURIComponent(group.id)}`}
                  className="block rounded-xl border border-primary/10 bg-surface-container p-5 transition-shadow hover:shadow-md"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                    {eventLabel}
                  </p>
                  <h2 className="mt-1 font-headline text-lg font-semibold text-primary">
                    {group.title}
                  </h2>
                  <p className="mt-1 text-sm text-primary/60">
                    {group.eventDate || "Date TBC"} · {group.memberCount ?? 0} members
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DesignerShell>
  );
}
