"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DesignerNoteCard } from "@/components/projects/DesignerNoteCard";
import { ProjectBreadcrumb } from "@/components/projects/ProjectBreadcrumb";
import { ProjectLogisticsCard } from "@/components/projects/ProjectLogisticsCard";
import { ReferenceGallery } from "@/components/projects/ReferenceGallery";
import {
  PROJECT_REFERENCE_IMAGES,
} from "@/lib/project-outfit-types";
import { useApp } from "@/context/AppContext";
import { isLocalDemoMode, isSupabaseEnabled } from "@/lib/config/backend";
import { createLinkedCustomerProjectForDesigner } from "@/lib/services/designerProjectCreateService";
import { createEmptyProjectItemDraft, type ProjectItemInput } from "@/lib/project-items";
import { ProjectGarmentDraftList } from "@/components/projects/ProjectGarmentDraftList";
import { cn } from "@/lib/cn";

const selectClass =
  "signup-field w-full appearance-none rounded-lg border py-4 pl-4 pr-10 text-primary outline-none focus:outline-none";

export function CreateProjectForm() {
  const router = useRouter();
  const { showToast, authUser, customers } = useApp();
  const useSupabase = isSupabaseEnabled();
  const [references, setReferences] = useState<string[]>(() =>
    isLocalDemoMode() ? [...PROJECT_REFERENCE_IMAGES] : []
  );
  const [garmentItems, setGarmentItems] = useState<ProjectItemInput[]>([
    createEmptyProjectItemDraft(),
  ]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "");
    const customerId = String(form.get("customer") ?? "");
    const customer = customers.find((c) => c.id === customerId);
    const outfitType = String(garmentItems[0]?.outfitType ?? "Bespoke");
    const deadline = String(form.get("deadline") ?? "");
    const budget = String(form.get("budget") ?? "");
    const description = String(form.get("description") ?? "").trim();

    const normalizedItems = garmentItems.map((item, index) => ({
      ...item,
      title: item.title.trim() || (index === 0 ? title : `Garment ${index + 1}`),
      outfitType: item.outfitType || outfitType,
      deadline: item.deadline || deadline,
      price: item.price || budget,
      description: item.description || (index === 0 ? description : item.description),
      referenceImages: index === 0 ? references : item.referenceImages,
    }));

    if (normalizedItems.some((item) => !item.outfitType)) {
      showToast("Each clothing item needs a type.", "error");
      return;
    }

    try {
      if (useSupabase) {
        if (!authUser?.designerId) {
          showToast("Designer profile not found. Please sign in again.", "error");
          return;
        }
        if (!customerId || !customer) {
          showToast("Please select a client.", "error");
          return;
        }
        const project = await createLinkedCustomerProjectForDesigner(authUser.designerId, {
          title,
          customerId,
          customerName: customer.name,
          outfitType: normalizedItems[0]?.outfitType ?? outfitType,
          deadline,
          budget,
          description,
          referenceImages: references,
          items: normalizedItems,
        });
        showToast("Project initialized successfully!");
        router.push(`/projects/${project.id}`);
        return;
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not create project", "error");
      return;
    }

    showToast("Project initialized successfully!");
    router.push("/projects/1");
  };

  const handleDraft = () => {
    showToast("Project saved as draft");
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === "__add_new__") {
      showToast("Add client flow coming soon");
      e.target.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pb-10 pt-6 lg:px-16 lg:pb-12 lg:pt-8">
      <div className="mb-8 lg:mb-10">
        <div className="hidden lg:block">
          <ProjectBreadcrumb current="Create New Project" />
        </div>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-primary lg:text-4xl">
          Start a New Commission
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted lg:text-base">
          Define the vision for a multi-garment commission. Add each clothing item with its own
          timeline, fabric notes, and production status.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-6 lg:col-span-8">
          <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md lg:p-8">
            <h3 className="mb-6 border-b border-[#d3c3ba]/20 pb-4 text-lg font-semibold text-primary">
              Project Fundamentals
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium text-ink-muted">
                  Project Title
                </label>
                <input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g., Wedding Outfits for Sandra"
                  className="signup-field w-full rounded-lg border px-4 py-4 text-primary placeholder:text-primary/40 outline-none focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="customer" className="block text-sm font-medium text-ink-muted">
                  Client
                </label>
                <div className="relative">
                  <select
                    id="customer"
                    name="customer"
                    required
                    defaultValue=""
                    onChange={handleCustomerChange}
                    className={selectClass}
                  >
                    <option value="" disabled>
                      Select a profile...
                    </option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__add_new__">+ Add New Client</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted/60" />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium text-ink-muted">
                  Project overview (optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={6}
                  placeholder="Describe the silhouette, fabric preferences, and emotional intent..."
                  className={cn(
                    "w-full resize-none rounded-lg border border-[#d3c3ba] bg-background px-4 py-4 text-sm text-primary",
                    "placeholder:text-primary/40 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                  )}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md lg:p-8">
            <ProjectGarmentDraftList
              items={garmentItems}
              onChange={setGarmentItems}
            />
          </section>

          <ReferenceGallery
            images={references}
            onRemove={(index) => setReferences((prev) => prev.filter((_, i) => i !== index))}
            onAdd={(url) => setReferences((prev) => [...prev, url])}
          />
        </div>

        <div className="space-y-6 lg:col-span-4">
          <ProjectLogisticsCard />
          <DesignerNoteCard />
          <div className="space-y-4 pt-2">
            <Button type="submit" variant="primary" size="lg" className="w-full py-5">
              Initialize Project
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full border-outline py-5"
              onClick={handleDraft}
            >
              Save as Draft
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
