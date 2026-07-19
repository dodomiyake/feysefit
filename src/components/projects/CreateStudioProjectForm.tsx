"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProjectBreadcrumb } from "@/components/projects/ProjectBreadcrumb";
import { ProjectLogisticsCard } from "@/components/projects/ProjectLogisticsCard";
import { ReferenceGallery } from "@/components/projects/ReferenceGallery";
import { projectOutfitTypes } from "@/lib/project-outfit-types";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { createProjectForStudioClient } from "@/lib/services/projectService";
import type { StudioClient } from "@/lib/studio-client";
import { cn } from "@/lib/cn";

const selectClass =
  "signup-field w-full appearance-none rounded-lg border py-4 pl-4 pr-10 text-primary outline-none focus:outline-none";

interface CreateStudioProjectFormProps {
  client: StudioClient;
}

export function CreateStudioProjectForm({ client }: CreateStudioProjectFormProps) {
  const router = useRouter();
  const { showToast, authUser } = useApp();
  const useSupabase = isSupabaseEnabled();
  const [references, setReferences] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "");
    const outfitType = String(form.get("outfit") ?? "Bespoke");
    const deadline = String(form.get("deadline") ?? "");
    const budget = String(form.get("budget") ?? "");
    const description = String(form.get("description") ?? "").trim();

    if (!authUser?.designerId) {
      showToast("Designer profile not found. Please sign in again.", "error");
      return;
    }

    try {
      const project = await createProjectForStudioClient(authUser.designerId, client.id, {
        title,
        outfitType,
        deadline,
        budget,
        description,
        referenceImages: references,
      });
      showToast(`Project created for ${client.name}`);
      router.push(`/projects/${project.id}`);
    } catch (error) {
      if (!useSupabase) {
        showToast("Studio projects require Supabase or enable demo storage", "error");
        return;
      }
      showToast(error instanceof Error ? error.message : "Could not create project", "error");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pb-10 pt-6 lg:px-16 lg:pb-12 lg:pt-8">
      <div className="mb-8 lg:mb-10">
        <div className="hidden lg:block">
          <ProjectBreadcrumb current="Walk-in commission" />
        </div>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-primary lg:text-4xl">
          New commission for {client.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted lg:text-base">
          Creates a private project linked to this studio client. Saved measurements copy across
          automatically — no app account required for {client.name.split(" ")[0]}.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-6 lg:col-span-8">
          <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm lg:p-8">
            <h3 className="mb-6 border-b border-[#d3c3ba]/20 pb-4 text-lg font-semibold text-primary">
              Project details
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium text-ink-muted">
                  Project title
                </label>
                <input
                  id="title"
                  name="title"
                  required
                  placeholder={`e.g., ${client.name.split(" ")[0]}'s occasion wear`}
                  className="signup-field w-full rounded-lg border px-4 py-4 text-primary placeholder:text-primary/40 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="outfit" className="block text-sm font-medium text-ink-muted">
                  Outfit type
                </label>
                <div className="relative">
                  <select id="outfit" name="outfit" required defaultValue="" className={selectClass}>
                    {projectOutfitTypes.map((opt) => (
                      <option key={opt.value || "empty"} value={opt.value} disabled={!opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted/60" />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium text-ink-muted">
                  Notes
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="Silhouette, fabric, event date…"
                  className={cn(
                    "w-full resize-none rounded-lg border border-[#d3c3ba] bg-background px-4 py-4 text-sm text-primary",
                    "placeholder:text-primary/40 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  )}
                />
              </div>
            </div>
          </section>

          <ReferenceGallery
            images={references}
            onRemove={(index) => setReferences((prev) => prev.filter((_, i) => i !== index))}
            onAdd={(url) => setReferences((prev) => [...prev, url])}
          />
        </div>

        <div className="space-y-6 lg:col-span-4">
          <ProjectLogisticsCard />
          <div className="rounded-xl border border-primary/10 bg-surface-container p-4 text-sm text-primary/70">
            <p className="font-medium text-primary">Studio client</p>
            <p className="mt-1">{client.name}</p>
            {client.phone && <p className="mt-0.5">{client.phone}</p>}
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full py-5">
            Create walk-in project
          </Button>
        </div>
      </form>
    </div>
  );
}
