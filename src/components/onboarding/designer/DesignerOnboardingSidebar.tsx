"use client";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { sidebarShellClass } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/cn";
import {
  CheckCircle2,
  Contact,
  Images,
  Pencil,
  Store,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const DESIGNER_ONBOARDING_STEPS = [
  { label: "Professional Details", icon: UserPlus },
  { label: "Contact & Services", icon: Contact },
  { label: "Portfolio Showcase", icon: Images },
  { label: "Review & Terms", icon: Store },
] as const;

interface DesignerOnboardingSidebarProps {
  step: number;
  onStepSelect?: (index: number) => void;
}

export function DesignerOnboardingSidebar({ step, onStepSelect }: DesignerOnboardingSidebarProps) {
  return (
    <aside className={sidebarShellClass}>
      <div className="mb-8 px-6">
        <BrandLogo onDark className="text-2xl font-extrabold tracking-tight" />
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Fashion Tech
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-4">
        {DESIGNER_ONBOARDING_STEPS.map((item, index) => {
          const isActive = index === step;
          const isComplete = index < step;
          const isDisabled = index > step;
          const Icon: LucideIcon = isComplete ? CheckCircle2 : item.icon;

          return (
            <button
              key={item.label}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onStepSelect?.(index)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors",
                isActive && "border-r-2 border-accent bg-accent/15 font-bold text-white",
                isComplete && !isActive && "text-accent hover:bg-white/5",
                isDisabled && "cursor-not-allowed text-zinc-600",
                !isActive &&
                  !isDisabled &&
                  !isComplete &&
                  "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 px-4 pb-6 pt-6">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <Pencil className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">New Designer</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Setup Phase
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
