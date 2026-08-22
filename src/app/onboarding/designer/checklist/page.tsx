"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import {
  designerChecklistProgress,
  type DesignerSetupChecklist,
} from "@/lib/onboarding";
import {
  getUserOnboardingState,
  updateUserOnboardingState,
} from "@/lib/services/onboardingService";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  FolderPlus,
  Images,
  Scissors,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/cn";

const CHECKLIST_ITEMS: Array<{
  key: keyof DesignerSetupChecklist;
  title: string;
  description: string;
  href: string;
  icon: typeof Images;
}> = [
  {
    key: "portfolioUploaded",
    title: "Upload portfolio images",
    description: "Show clients your best work on your profile.",
    href: "/settings",
    icon: Images,
  },
  {
    key: "servicesAdded",
    title: "Confirm services & delivery",
    description: "Review specialties, service areas, and delivery options.",
    href: "/settings",
    icon: Scissors,
  },
  {
    key: "availabilitySet",
    title: "Set appointment availability",
    description: "Publish calendar slots so clients can book fittings.",
    href: "/settings",
    icon: CalendarDays,
  },
  {
    key: "clientInvited",
    title: "Invite your first client",
    description: "Send an invite link to start a private commission.",
    href: "/invite",
    icon: UserPlus,
  },
  {
    key: "projectCreated",
    title: "Create your first project",
    description: "Open a commission and track garments through production.",
    href: "/projects/new",
    icon: FolderPlus,
  },
];

export default function DesignerSetupChecklistPage() {
  const router = useRouter();
  const { authUser, showToast, projects, customers } = useApp();
  const useSupabase = isSupabaseEnabled();
  const [checklist, setChecklist] = useState<DesignerSetupChecklist>({});
  const [loading, setLoading] = useState(Boolean(useSupabase && authUser?.id));
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!useSupabase || !authUser?.id) {
      return;
    }
    let cancelled = false;
    void getUserOnboardingState(authUser.id)
      .then((state) => {
        if (cancelled) return;
        const inferred: DesignerSetupChecklist = {
          ...state.setupChecklist,
          projectCreated:
            state.setupChecklist.projectCreated || projects.some((p) => p.designerId === authUser.designerId),
          clientInvited:
            state.setupChecklist.clientInvited || customers.length > 0,
        };
        setChecklist(inferred);
      })
      .catch(() => {
        if (!cancelled) setChecklist({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, authUser?.designerId, customers.length, projects, useSupabase]);

  const progress = designerChecklistProgress(checklist);

  const markDone = async (key: keyof DesignerSetupChecklist) => {
    if (!authUser?.id || !useSupabase) {
      setChecklist((prev) => ({ ...prev, [key]: true }));
      return;
    }
    setSavingKey(key);
    try {
      const next = { ...checklist, [key]: true };
      await updateUserOnboardingState(authUser.id, { setupChecklist: next });
      setChecklist(next);
      showToast("Checklist updated");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not update checklist", "error");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <TopBar title="Studio Setup" showBack backHref="/dashboard/designer" />
      </div>

      <header className="hidden border-b border-primary/10 lg:block">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-8">
          <BrandLogo className="text-xl font-extrabold tracking-tight" />
          <Button variant="secondary" size="sm" onClick={() => router.push("/dashboard/designer")}>
            Go to dashboard
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 lg:px-8 lg:py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Designer setup checklist
        </p>
        <h1 className="mt-3 font-headline text-3xl font-bold text-primary">
          Finish setting up your atelier
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-primary/65">
          Your marketplace profile stays hidden or pending review until essentials are complete.
          You can resume this checklist anytime from your dashboard.
        </p>

        <div className="mt-6 rounded-xl border border-primary/10 bg-surface-container p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-primary">Progress</span>
            <span className="text-primary/60">
              {progress.done}/{progress.total} complete
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-primary/55">Loading checklist…</p>
        ) : (
          <ul className="mt-8 space-y-4">
            {CHECKLIST_ITEMS.map((item) => {
              const done = Boolean(checklist[item.key]);
              const Icon = item.icon;
              return (
                <li
                  key={item.key}
                  className="rounded-xl border border-primary/10 bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          done ? "bg-emerald-100 text-emerald-700" : "bg-highlight/15 text-accent"
                        )}
                      >
                        {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-primary">{item.title}</p>
                        <p className="mt-1 text-sm text-primary/60">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={item.href}
                        className="inline-flex items-center rounded-full border border-primary/15 px-4 py-2 text-sm font-medium text-primary hover:bg-surface"
                      >
                        Open
                      </Link>
                      {!done && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={savingKey === item.key}
                          onClick={() => void markDone(item.key)}
                        >
                          {savingKey === item.key ? "Saving…" : "Mark done"}
                        </Button>
                      )}
                      {done && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                          <Circle className="h-3 w-3 fill-current" /> Done
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="zinc"
            className="rounded-full"
            onClick={() => router.push("/dashboard/designer")}
          >
            Continue to dashboard
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="rounded-full"
            onClick={() => router.push("/invite")}
          >
            Invite a client
          </Button>
        </div>
      </main>
    </div>
  );
}
