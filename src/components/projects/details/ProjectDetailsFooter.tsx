"use client";

import type { ResolvedProjectDetails } from "@/lib/project-details";
import { useApp } from "@/context/AppContext";
import { Archive, Printer, Share2 } from "lucide-react";

interface ProjectDetailsFooterProps {
  details: ResolvedProjectDetails;
}

export function ProjectDetailsFooter({ details }: ProjectDetailsFooterProps) {
  const { showToast } = useApp();

  const actions = [
    { icon: Share2, label: "Share", action: () => showToast("Share link copied") },
    { icon: Printer, label: "Print", action: () => showToast("Print view coming soon") },
    { icon: Archive, label: "Archive", action: () => showToast("Archive project coming soon") },
  ];

  return (
    <footer className="mt-6 flex flex-col gap-3 border-t border-[#d3c3ba]/25 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-ink-muted">
        Last updated <span className="font-medium text-primary">{details.lastUpdated}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            className="inline-flex items-center gap-2 rounded-lg border border-[#d3c3ba]/30 bg-background px-3 py-2 text-xs font-medium text-primary transition-colors hover:border-accent/40 hover:bg-accent/5"
          >
            <item.icon className="h-3.5 w-3.5 text-ink-muted" />
            {item.label}
          </button>
        ))}
      </div>
    </footer>
  );
}
