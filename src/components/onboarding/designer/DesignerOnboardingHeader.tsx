"use client";

import { Button } from "@/components/ui/Button";
import { HelpCircle } from "lucide-react";

interface DesignerOnboardingHeaderProps {
  step: number;
  totalSteps: number;
  onSaveDraft: () => void;
}

export function DesignerOnboardingHeader({
  step,
  totalSteps,
  onSaveDraft,
}: DesignerOnboardingHeaderProps) {
  return (
    <header className="fixed top-0 right-0 z-40 hidden h-16 w-full items-center justify-between border-b border-primary/10 bg-background/80 px-16 backdrop-blur-md lg:flex lg:w-[calc(100%-16rem)]">
      <div className="flex items-center gap-4">
        <span className="font-headline text-2xl font-semibold text-primary">Onboarding</span>
        <span className="h-4 w-px bg-[#d3c3ba]" />
        <span className="text-sm font-medium text-ink-muted">
          Step {step + 1} of {totalSteps}
        </span>
      </div>
      <div className="flex items-center gap-6">
        <button
          type="button"
          className="text-ink-muted transition-opacity hover:opacity-70"
          aria-label="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
        <Button
          type="button"
          variant="zinc"
          size="sm"
          className="rounded-full px-6"
          onClick={onSaveDraft}
        >
          Save Draft
        </Button>
      </div>
    </header>
  );
}
