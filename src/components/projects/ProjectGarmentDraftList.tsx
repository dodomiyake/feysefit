"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { projectOutfitTypes } from "@/lib/project-outfit-types";
import {
  createEmptyProjectItemDraft,
  type ProjectItemInput,
} from "@/lib/project-items";
import { cn } from "@/lib/cn";

interface ProjectGarmentDraftListProps {
  items: ProjectItemInput[];
  onChange: (items: ProjectItemInput[]) => void;
  sharedDeadline?: string;
  sharedBudget?: string;
}

export function ProjectGarmentDraftList({
  items,
  onChange,
  sharedDeadline = "",
  sharedBudget = "",
}: ProjectGarmentDraftListProps) {
  const updateItem = (index: number, patch: Partial<ProjectItemInput>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    onChange([
      ...items,
      createEmptyProjectItemDraft({
        deadline: sharedDeadline,
        price: sharedBudget,
      }),
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-primary">Clothing items</h3>
          <p className="text-sm text-primary/60">
            Add every garment in this commission. Each item gets its own timeline.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addItem}>
          <Plus className="mr-1 h-4 w-4" />
          Add item
        </Button>
      </div>

      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-lg border border-primary/10 bg-background/50 p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-primary">Item {index + 1}</p>
            {items.length > 1 ? (
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              name={`item-title-${index}`}
              required
              placeholder="Garment title"
              value={item.title}
              onChange={(e) => updateItem(index, { title: e.target.value })}
              className="signup-field rounded-lg border px-3 py-3 text-sm text-primary"
            />
            <select
              name={`item-outfit-${index}`}
              required
              value={item.outfitType}
              onChange={(e) => updateItem(index, { outfitType: e.target.value })}
              className="signup-field rounded-lg border px-3 py-3 text-sm text-primary"
            >
              <option value="" disabled>
                Clothing type
              </option>
              {projectOutfitTypes
                .filter((opt) => opt.value)
                .map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
            </select>
            <input
              placeholder="Item price (optional)"
              value={item.price}
              onChange={(e) => updateItem(index, { price: e.target.value })}
              className="signup-field rounded-lg border px-3 py-3 text-sm text-primary"
            />
            <input
              type="date"
              value={item.deadline || sharedDeadline}
              onChange={(e) => updateItem(index, { deadline: e.target.value })}
              className="signup-field rounded-lg border px-3 py-3 text-sm text-primary"
            />
            <textarea
              placeholder="Description, fabric, or notes for this garment…"
              value={item.description ?? ""}
              onChange={(e) => updateItem(index, { description: e.target.value })}
              rows={3}
              className={cn(
                "md:col-span-2 w-full resize-none rounded-lg border border-[#d3c3ba] bg-background px-3 py-3 text-sm text-primary"
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
