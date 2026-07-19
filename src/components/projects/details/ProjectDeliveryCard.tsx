"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Project } from "@/lib/mock-data";
import {
  DELIVERY_METHOD_OPTIONS,
  LOCAL_DELIVERY_STATUS_OPTIONS,
  formatDeliveryMethodLabel,
  formatLocalDeliveryStatusLabel,
  hasDeliveryData,
  type DeliveryMethod,
  type LocalDeliveryStatus,
} from "@/lib/local-customer";
import { updateProjectLocalOps } from "@/lib/services/localProjectService";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/cn";

interface ProjectDeliveryCardProps {
  project: Project;
  canEdit?: boolean;
  variant?: "default" | "sidebar";
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/40 px-3 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-primary">{value}</dd>
    </div>
  );
}

export function ProjectDeliveryCard({
  project,
  canEdit = false,
  variant = "default",
}: ProjectDeliveryCardProps) {
  const { refreshAppData, showToast } = useApp();
  const [saving, setSaving] = useState(false);

  const savedDelivery = useMemo(
    () => ({
      deliveryMethod: project.deliveryMethod ?? "",
      localDeliveryStatus: project.localDeliveryStatus ?? "",
    }),
    [project]
  );

  const [deliveryMethod, setDeliveryMethod] = useState(savedDelivery.deliveryMethod);
  const [localDeliveryStatus, setLocalDeliveryStatus] = useState(savedDelivery.localDeliveryStatus);
  const [confirmedDelivery, setConfirmedDelivery] = useState<typeof savedDelivery | null>(null);

  const displayDelivery = confirmedDelivery ?? savedDelivery;
  const hasSavedDelivery = hasDeliveryData({
    deliveryMethod: displayDelivery.deliveryMethod as DeliveryMethod | undefined,
    localDeliveryStatus: displayDelivery.localDeliveryStatus as LocalDeliveryStatus | undefined,
  });

  const [editing, setEditing] = useState(
    () =>
      canEdit &&
      !hasDeliveryData({
        deliveryMethod: savedDelivery.deliveryMethod as DeliveryMethod | undefined,
        localDeliveryStatus: savedDelivery.localDeliveryStatus as LocalDeliveryStatus | undefined,
      })
  );

  useEffect(() => {
    setConfirmedDelivery(null);
    setDeliveryMethod(savedDelivery.deliveryMethod);
    setLocalDeliveryStatus(savedDelivery.localDeliveryStatus);
    setEditing(
      canEdit &&
        !hasDeliveryData({
          deliveryMethod: savedDelivery.deliveryMethod as DeliveryMethod | undefined,
          localDeliveryStatus: savedDelivery.localDeliveryStatus as LocalDeliveryStatus | undefined,
        })
    );
  }, [project.id, savedDelivery, canEdit]);

  if (!canEdit && !hasSavedDelivery) {
    return null;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const patch = {
        deliveryMethod: (deliveryMethod || undefined) as DeliveryMethod | undefined,
        localDeliveryStatus: (localDeliveryStatus || undefined) as LocalDeliveryStatus | undefined,
      };
      await updateProjectLocalOps(project.id, patch);
      setConfirmedDelivery({ deliveryMethod, localDeliveryStatus });
      setEditing(false);
      await refreshAppData();
      showToast("Saved — your client can see this on their project", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-5 shadow-warm">
      <h3 className="font-headline text-lg font-semibold text-primary">Pickup & delivery</h3>
      {!canEdit && (
        <p className="mt-1 text-sm text-primary/60">How and when your order will reach you.</p>
      )}

      {canEdit && (editing || !hasSavedDelivery) ? (
        <>
          <div
            className={cn(
              "mt-4 grid gap-3",
              variant === "sidebar" ? "grid-cols-1" : "sm:grid-cols-2"
            )}
          >
            <label className="block text-sm">
              <span className="mb-1 block text-primary/60">Delivery method</span>
              <select
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value)}
                className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
              >
                <option value="">Not set</option>
                {DELIVERY_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-primary/60">Status</span>
              <select
                value={localDeliveryStatus}
                onChange={(e) => setLocalDeliveryStatus(e.target.value)}
                className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
              >
                <option value="">Not set</option>
                {LOCAL_DELIVERY_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save delivery"}
            </Button>
            {hasSavedDelivery && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={saving}
                onClick={() => {
                  setDeliveryMethod(displayDelivery.deliveryMethod);
                  setLocalDeliveryStatus(displayDelivery.localDeliveryStatus);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4">
          <dl
            className={cn(
              "grid gap-3",
              variant === "sidebar" ? "grid-cols-1" : "sm:grid-cols-2"
            )}
          >
            <SummaryRow
              label="Delivery method"
              value={formatDeliveryMethodLabel(displayDelivery.deliveryMethod as DeliveryMethod)}
            />
            <SummaryRow
              label="Status"
              value={formatLocalDeliveryStatusLabel(
                displayDelivery.localDeliveryStatus as LocalDeliveryStatus
              )}
            />
          </dl>
          {canEdit && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setEditing(true)}
            >
              Update delivery
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
