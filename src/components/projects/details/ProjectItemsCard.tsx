"use client";

import { useState } from "react";
import { Plus, Shirt } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useApp } from "@/context/AppContext";
import { productionProjectStatuses, type ProjectStatus } from "@/lib/design-tokens";
import {
  aggregateProjectProgressPercent,
  formatAggregateProgressLabel,
  type ProjectItem,
  type ProjectItemInput,
  createEmptyProjectItemDraft,
} from "@/lib/project-items";
import { getProjectStatusLabel, getProductionTimelineProgress } from "@/lib/project-delivery";
import { projectOutfitTypes } from "@/lib/project-outfit-types";
import {
  createProjectItems,
  deleteProjectItem,
  updateProjectItem,
} from "@/lib/services/projectItemService";
import { isSupabaseEnabled } from "@/lib/config/backend";
import type { Project } from "@/lib/mock-data";
import { cn } from "@/lib/cn";

interface ProjectItemsCardProps {
  project: Project;
  isDesigner: boolean;
  isCustomer?: boolean;
  onItemsChange?: (items: ProjectItem[]) => void;
}

function ItemStatusSelect({
  item,
  projectId,
  onUpdated,
}: {
  item: ProjectItem;
  projectId: string;
  onUpdated: (item: ProjectItem) => void;
}) {
  const { showToast } = useApp();

  return (
    <select
      value={item.status}
      aria-label={`Update status for ${item.title}`}
      onChange={(e) => {
        const status = e.target.value as ProjectStatus;
        void updateProjectItem(item.id, projectId, { status })
          .then(onUpdated)
          .catch((error) =>
            showToast(error instanceof Error ? error.message : "Could not update garment", "error")
          );
      }}
      className="cursor-pointer rounded-full border border-primary/15 bg-background py-1.5 pl-3 pr-8 text-xs font-medium text-primary focus:border-accent focus:outline-none"
    >
      {productionProjectStatuses.map((step) => (
        <option key={step} value={step}>
          {getProjectStatusLabel(step)}
        </option>
      ))}
    </select>
  );
}

export function ProjectItemsCard({
  project,
  isDesigner,
  isCustomer = false,
  onItemsChange,
}: ProjectItemsCardProps) {
  const { showToast, refreshAppData } = useApp();
  const useSupabase = isSupabaseEnabled();
  const [items, setItems] = useState<ProjectItem[]>(project.items ?? []);
  const [itemsProjectId, setItemsProjectId] = useState(project.id);
  if (project.id !== itemsProjectId) {
    setItemsProjectId(project.id);
    setItems(project.items ?? []);
  }
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<ProjectItemInput>(createEmptyProjectItemDraft());

  const progressLabel = formatAggregateProgressLabel(items);
  const progressPercent = aggregateProjectProgressPercent(items);

  const syncItems = (next: ProjectItem[]) => {
    setItems(next);
    onItemsChange?.(next);
    void refreshAppData();
  };

  const handleAdd = async () => {
    if (!draft.title.trim() || !draft.outfitType) {
      showToast("Garment title and type are required.", "error");
      return;
    }
    if (!useSupabase) {
      showToast("Connect Supabase to manage garments.", "error");
      return;
    }
    setAdding(true);
    try {
      const created = await createProjectItems(project.id, [draft]);
      syncItems([...items, ...created]);
      setDraft(createEmptyProjectItemDraft());
      showToast("Garment added to project.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not add garment", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (itemId: string) => {
    if (!useSupabase || items.length <= 1) {
      showToast("Each project needs at least one garment.", "error");
      return;
    }
    try {
      await deleteProjectItem(itemId, project.id);
      syncItems(items.filter((item) => item.id !== itemId));
      showToast("Garment removed.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not remove garment", "error");
    }
  };

  if (!items.length && !isDesigner) {
    return null;
  }

  return (
    <section className="mb-6 rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm lg:mb-8 lg:p-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-lg font-semibold text-primary">Clothing items</h2>
          <p className="mt-1 text-sm text-primary/60">
            {isCustomer
              ? "Track each garment in your commission separately."
              : "Manage garments under this commission. Overall project progress follows the slowest item."}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-primary/50">Combined</p>
          <p className="text-sm font-semibold text-primary">{progressLabel}</p>
        </div>
      </div>

      <div className="mb-5 h-2 overflow-hidden rounded-full bg-primary/10">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const itemProgress = Math.round(getProductionTimelineProgress(item.status));
          return (
            <article
              key={item.id}
              className="rounded-lg border border-primary/10 bg-background/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-highlight/15 text-accent">
                    <Shirt className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-primary">{item.title}</h3>
                    <p className="text-xs text-primary/55">
                      {item.outfitType}
                      {item.deadline ? ` · Due ${item.deadline}` : ""}
                      {item.price ? ` · ${item.price}` : ""}
                    </p>
                    {item.description ? (
                      <p className="mt-2 text-sm text-primary/70">{item.description}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{itemProgress}%</Badge>
                  {isDesigner ? (
                    <ItemStatusSelect
                      item={item}
                      projectId={project.id}
                      onUpdated={(updated) =>
                        syncItems(items.map((row) => (row.id === updated.id ? updated : row)))
                      }
                    />
                  ) : (
                    <Badge>{getProjectStatusLabel(item.status)}</Badge>
                  )}
                </div>
              </div>

              {(item.primaryFabric || item.secondaryMaterial || item.lining) && (
                <p className="mt-3 text-xs text-primary/60">
                  Fabric: {[item.primaryFabric, item.secondaryMaterial, item.lining]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}

              {item.measurementsRequired && (
                <p className="mt-2 text-xs text-accent">
                  Item-specific measurements requested
                  {item.measurementNotes ? ` — ${item.measurementNotes}` : ""}
                </p>
              )}

              {isDesigner && items.length > 1 ? (
                <button
                  type="button"
                  onClick={() => void handleRemove(item.id)}
                  className="mt-3 text-xs text-red-600 hover:underline"
                >
                  Remove garment
                </button>
              ) : null}
            </article>
          );
        })}
      </div>

      {isDesigner && (
        <div className="mt-6 border-t border-primary/10 pt-5">
          <p className="mb-3 text-sm font-medium text-primary">Add another garment</p>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              placeholder="Garment title (e.g. Reception dress)"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="signup-field rounded-lg border px-3 py-3 text-sm text-primary"
            />
            <select
              value={draft.outfitType}
              onChange={(e) => setDraft((d) => ({ ...d, outfitType: e.target.value }))}
              className="signup-field rounded-lg border px-3 py-3 text-sm text-primary"
            >
              <option value="">Clothing type…</option>
              {projectOutfitTypes
                .filter((opt) => opt.value)
                .map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
            </select>
            <input
              placeholder="Price (optional)"
              value={draft.price}
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
              className="signup-field rounded-lg border px-3 py-3 text-sm text-primary"
            />
            <input
              type="date"
              value={draft.deadline}
              onChange={(e) => setDraft((d) => ({ ...d, deadline: e.target.value }))}
              className="signup-field rounded-lg border px-3 py-3 text-sm text-primary"
            />
            <textarea
              placeholder="Description, fabric notes, or fitting details…"
              value={draft.description ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              rows={3}
              className={cn(
                "md:col-span-2 w-full resize-none rounded-lg border border-[#d3c3ba] bg-background px-3 py-3 text-sm text-primary"
              )}
            />
            <label className="flex items-center gap-2 text-sm text-primary/70 md:col-span-2">
              <input
                type="checkbox"
                checked={draft.measurementsRequired}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, measurementsRequired: e.target.checked }))
                }
              />
              Request item-specific measurements (uses customer profile as baseline)
            </label>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4"
            disabled={adding}
            onClick={() => void handleAdd()}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add garment
          </Button>
        </div>
      )}
    </section>
  );
}
