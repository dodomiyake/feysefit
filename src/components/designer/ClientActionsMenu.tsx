"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Customer, Project } from "@/lib/mock-data";
import { customerProjectsHref } from "@/lib/customer-display";
import { customerMessageThreadHref } from "@/lib/message-links";
import { cn } from "@/lib/cn";
import { FolderKanban, MessageSquare, MoreHorizontal, Ruler, UserRound } from "lucide-react";

interface ClientActionsMenuProps {
  customer: Customer;
  projects: Project[];
  className?: string;
}

export function ClientActionsMenu({ customer, projects, className }: ClientActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const profileHref = `/clients/${encodeURIComponent(customer.id)}`;
  const measurementsHref = `/clients/measurements?customer=${encodeURIComponent(customer.id)}`;
  const messageHref = customerMessageThreadHref(customer.id, projects);
  const projectsHref = customerProjectsHref(customer.id, projects);

  const items = [
    { href: profileHref, label: "View profile", icon: UserRound },
    { href: measurementsHref, label: "View measurements", icon: Ruler },
    { href: messageHref, label: "Send message", icon: MessageSquare },
    { href: projectsHref, label: "View projects", icon: FolderKanban },
  ] as const;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full p-2 text-primary/40 transition-colors hover:bg-background hover:text-primary"
        aria-label={`More options for ${customer.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-primary/10 bg-background py-1 shadow-warm"
        >
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-primary transition-colors hover:bg-surface-container"
            >
              <item.icon className="h-4 w-4 shrink-0 text-primary/45" />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
