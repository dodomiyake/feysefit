"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import {
  designerChecklistProgress,
  type DesignerSetupChecklist,
} from "@/lib/onboarding";
import { getUserOnboardingState } from "@/lib/services/onboardingService";
import { ListChecks } from "lucide-react";

export function DesignerSetupChecklistCard() {
  const { authUser } = useApp();
  const useSupabase = isSupabaseEnabled();
  const [checklist, setChecklist] = useState<DesignerSetupChecklist | null>(null);

  useEffect(() => {
    if (!useSupabase || !authUser?.id) return;
    let cancelled = false;
    void getUserOnboardingState(authUser.id)
      .then((state) => {
        if (!cancelled) setChecklist(state.setupChecklist);
      })
      .catch(() => {
        if (!cancelled) setChecklist(null);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, useSupabase]);

  if (!checklist) return null;

  const progress = designerChecklistProgress(checklist);
  if (progress.done >= progress.total) return null;

  return (
    <section className="mb-8 rounded-2xl border border-accent/20 bg-highlight/10 p-5 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-accent">
            <ListChecks className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-primary">Finish studio setup</h2>
            <p className="mt-1 text-sm text-primary/65">
              {progress.done} of {progress.total} checklist items done. Marketplace stays pending
              until your profile essentials are complete.
            </p>
          </div>
        </div>
        <Link
          href="/onboarding/designer/checklist"
          className="inline-flex items-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Resume checklist
        </Link>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary/10">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </section>
  );
}
