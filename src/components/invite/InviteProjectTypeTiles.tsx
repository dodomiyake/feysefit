"use client";

import {
  inviteProjectTypeOptions,
  type InviteProjectType,
} from "@/lib/invite-types";
import { cn } from "@/lib/cn";

interface InviteProjectTypeTilesProps {
  value: InviteProjectType;
  onChange: (value: InviteProjectType) => void;
}

export function InviteProjectTypeTiles({ value, onChange }: InviteProjectTypeTilesProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-0 block px-1 text-sm font-medium text-ink-muted">
        Initial Project Type
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {inviteProjectTypeOptions.map((option) => {
          const selected = value === option.id;
          const Icon = option.icon;

          return (
            <label
              key={option.id}
              className="group relative cursor-pointer"
            >
              <input
                type="radio"
                name="project_type"
                value={option.id}
                checked={selected}
                onChange={() => onChange(option.id)}
                className="peer sr-only"
              />
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border bg-background p-4 transition-all",
                  "border-[#d3c3ba]/40 group-hover:bg-surface-container",
                  selected && "border-accent bg-accent/5 shadow-[inset_0_0_0_1px_rgba(179,134,1,0.2)]"
                )}
              >
                <Icon
                  className={cn(
                    "mb-2 h-6 w-6",
                    selected ? "text-accent" : "text-ink-muted"
                  )}
                  strokeWidth={1.75}
                />
                <span className="text-sm font-medium text-primary">{option.label}</span>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
