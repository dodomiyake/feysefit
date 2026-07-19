"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers, Loader2, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TextArea } from "@/components/ui/TextArea";
import { useApp } from "@/context/AppContext";
import {
  FABRIC_CUSTOM_VALUE,
  LINING_OPTIONS,
  PRIMARY_FABRIC_OPTIONS,
  SECONDARY_MATERIAL_OPTIONS,
  resolveFabricSaveValue,
  resolveFabricSelectValue,
  type FabricOption,
} from "@/lib/fabric-options";
import type { Project } from "@/lib/mock-data";
import {
  updateCustomerFabricSelection,
  updateDesignerFabricAdvice,
} from "@/lib/services/projectService";

interface ProjectFabricCardProps {
  project: Project;
  isCustomer: boolean;
  isDesigner: boolean;
  isAdmin?: boolean;
}

function displayFabric(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "Not selected yet";
}

function withPlaceholder(options: FabricOption[]) {
  return [{ value: "", label: "Select an option…" }, ...options, { value: FABRIC_CUSTOM_VALUE, label: "Other (specify)" }];
}

interface FabricPickerProps {
  id: string;
  label: string;
  options: FabricOption[];
  selectValue: string;
  customText: string;
  onSelectChange: (value: string) => void;
  onCustomChange: (value: string) => void;
  disabled?: boolean;
}

function FabricPicker({
  id,
  label,
  options,
  selectValue,
  customText,
  onSelectChange,
  onCustomChange,
  disabled,
}: FabricPickerProps) {
  return (
    <div className="space-y-3">
      <Select
        id={id}
        label={label}
        value={selectValue}
        disabled={disabled}
        options={withPlaceholder(options)}
        onChange={(event) => onSelectChange(event.target.value)}
      />
      {selectValue === FABRIC_CUSTOM_VALUE && (
        <Input
          id={`${id}-custom`}
          label="Custom choice"
          value={customText}
          disabled={disabled}
          placeholder="Describe your preferred material"
          onChange={(event) => onCustomChange(event.target.value)}
        />
      )}
    </div>
  );
}

export function ProjectFabricCard({
  project,
  isCustomer,
  isDesigner,
  isAdmin = false,
}: ProjectFabricCardProps) {
  const { showToast, refreshAppData } = useApp();
  const [savingFabrics, setSavingFabrics] = useState(false);
  const [savingAdvice, setSavingAdvice] = useState(false);

  const initialPrimary = useMemo(
    () => resolveFabricSelectValue(project.primaryFabric, PRIMARY_FABRIC_OPTIONS),
    [project.primaryFabric]
  );
  const initialSecondary = useMemo(
    () => resolveFabricSelectValue(project.secondaryMaterial, SECONDARY_MATERIAL_OPTIONS),
    [project.secondaryMaterial]
  );
  const initialLining = useMemo(
    () => resolveFabricSelectValue(project.lining, LINING_OPTIONS),
    [project.lining]
  );

  const [primarySelect, setPrimarySelect] = useState(initialPrimary.selectValue);
  const [primaryCustom, setPrimaryCustom] = useState(initialPrimary.customText);
  const [secondarySelect, setSecondarySelect] = useState(initialSecondary.selectValue);
  const [secondaryCustom, setSecondaryCustom] = useState(initialSecondary.customText);
  const [liningSelect, setLiningSelect] = useState(initialLining.selectValue);
  const [liningCustom, setLiningCustom] = useState(initialLining.customText);
  const [adviceDraft, setAdviceDraft] = useState(project.designerFabricAdvice ?? "");
  const [confirmedFabrics, setConfirmedFabrics] = useState<{
    primaryFabric: string;
    secondaryMaterial: string;
    lining: string;
  } | null>(null);
  const [confirmedAdvice, setConfirmedAdvice] = useState<string | null>(null);

  const savedPrimaryFabric = project.primaryFabric ?? confirmedFabrics?.primaryFabric;
  const savedSecondaryMaterial = project.secondaryMaterial ?? confirmedFabrics?.secondaryMaterial;
  const savedLining = project.lining ?? confirmedFabrics?.lining;
  const savedAdvice = project.designerFabricAdvice ?? confirmedAdvice ?? "";
  const hasSavedFabrics = Boolean(savedPrimaryFabric?.trim() && savedLining?.trim());
  const hasSavedAdvice = Boolean(savedAdvice.trim());

  const canEditFabrics = isCustomer && !isAdmin;
  const canAdvise = isDesigner && !isAdmin;
  const showReadOnlySummary = !canEditFabrics;
  const [editingFabrics, setEditingFabrics] = useState(() => !hasSavedFabrics);
  const [editingAdvice, setEditingAdvice] = useState(() => !hasSavedAdvice);

  useEffect(() => {
    setConfirmedFabrics(null);
    setConfirmedAdvice(null);
    const savedOnProject = Boolean(project.primaryFabric?.trim() && project.lining?.trim());
    setEditingFabrics(!savedOnProject);
    const savedAdviceOnProject = Boolean(project.designerFabricAdvice?.trim());
    setEditingAdvice(!savedAdviceOnProject);
  }, [project.id, project.primaryFabric, project.lining, project.designerFabricAdvice]);

  useEffect(() => {
    if (editingFabrics) return;

    const primary = resolveFabricSelectValue(savedPrimaryFabric, PRIMARY_FABRIC_OPTIONS);
    const secondary = resolveFabricSelectValue(savedSecondaryMaterial, SECONDARY_MATERIAL_OPTIONS);
    const lining = resolveFabricSelectValue(savedLining, LINING_OPTIONS);
    setPrimarySelect(primary.selectValue);
    setPrimaryCustom(primary.customText);
    setSecondarySelect(secondary.selectValue);
    setSecondaryCustom(secondary.customText);
    setLiningSelect(lining.selectValue);
    setLiningCustom(lining.customText);
  }, [savedPrimaryFabric, savedSecondaryMaterial, savedLining, editingFabrics]);

  useEffect(() => {
    if (editingAdvice) return;
    setAdviceDraft(savedAdvice);
  }, [savedAdvice, editingAdvice]);

  const showFabricForm = canEditFabrics && (editingFabrics || !hasSavedFabrics);
  const showCustomerSummary = canEditFabrics && hasSavedFabrics && !editingFabrics;
  const showAdviceForm = canAdvise && (editingAdvice || !hasSavedAdvice);
  const showAdviceSummary = canAdvise && hasSavedAdvice && !editingAdvice;

  function resetFabricDraftFromProject() {
    const primary = resolveFabricSelectValue(savedPrimaryFabric, PRIMARY_FABRIC_OPTIONS);
    const secondary = resolveFabricSelectValue(savedSecondaryMaterial, SECONDARY_MATERIAL_OPTIONS);
    const lining = resolveFabricSelectValue(savedLining, LINING_OPTIONS);
    setPrimarySelect(primary.selectValue);
    setPrimaryCustom(primary.customText);
    setSecondarySelect(secondary.selectValue);
    setSecondaryCustom(secondary.customText);
    setLiningSelect(lining.selectValue);
    setLiningCustom(lining.customText);
  }

  function handleDiscardFabrics() {
    resetFabricDraftFromProject();
    setEditingFabrics(false);
  }

  function resetAdviceDraftFromProject() {
    setAdviceDraft(savedAdvice);
  }

  function handleDiscardAdvice() {
    resetAdviceDraftFromProject();
    setEditingAdvice(false);
  }

  async function handleSaveFabrics() {
    const primaryFabric = resolveFabricSaveValue(primarySelect, primaryCustom);
    const secondaryMaterial = resolveFabricSaveValue(secondarySelect, secondaryCustom);
    const lining = resolveFabricSaveValue(liningSelect, liningCustom);

    if (!primaryFabric) {
      showToast("Select a primary fabric", "error");
      return;
    }
    if (!lining) {
      showToast("Select a lining", "error");
      return;
    }

    setSavingFabrics(true);
    try {
      await updateCustomerFabricSelection(project.id, {
        primaryFabric,
        secondaryMaterial,
        lining,
      });
      setConfirmedFabrics({ primaryFabric, secondaryMaterial, lining });
      await refreshAppData();
      setEditingFabrics(false);
      showToast("Fabric selections saved");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save fabrics", "error");
    } finally {
      setSavingFabrics(false);
    }
  }

  async function handleSaveAdvice() {
    const trimmed = adviceDraft.trim();
    if (!trimmed) {
      showToast("Add fabric advice before saving", "error");
      return;
    }

    setSavingAdvice(true);
    try {
      await updateDesignerFabricAdvice(project.id, trimmed);
      setConfirmedAdvice(trimmed);
      await refreshAppData();
      setEditingAdvice(false);
      showToast("Fabric advice saved for your client");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save advice", "error");
    } finally {
      setSavingAdvice(false);
    }
  }

  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-5 shadow-warm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Layers className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-headline text-lg font-semibold text-primary">Fabric & lining</h3>
          <p className="mt-1 text-sm text-primary/60">
            {showCustomerSummary
              ? "Your fabric choices are saved. Your designer can advise below."
              : canEditFabrics
              ? "You choose the fabrics for your commission. Your designer can advise below once you save."
              : canAdvise
                ? "Review your client's fabric choices and share professional guidance."
                : "Client fabric selections and designer notes for this commission."}
          </p>
        </div>
      </div>

      {showFabricForm ? (
        <div className="mt-5 space-y-4">
          <FabricPicker
            id="primary-fabric"
            label="Primary fabric"
            options={PRIMARY_FABRIC_OPTIONS}
            selectValue={primarySelect}
            customText={primaryCustom}
            onSelectChange={setPrimarySelect}
            onCustomChange={setPrimaryCustom}
          />
          <FabricPicker
            id="secondary-material"
            label="Secondary material (optional)"
            options={SECONDARY_MATERIAL_OPTIONS}
            selectValue={secondarySelect}
            customText={secondaryCustom}
            onSelectChange={setSecondarySelect}
            onCustomChange={setSecondaryCustom}
          />
          <FabricPicker
            id="lining"
            label="Lining"
            options={LINING_OPTIONS}
            selectValue={liningSelect}
            customText={liningCustom}
            onSelectChange={setLiningSelect}
            onCustomChange={setLiningCustom}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="button" className="w-full sm:w-auto" onClick={handleSaveFabrics} disabled={savingFabrics}>
              {savingFabrics ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </span>
              ) : (
                "Save fabric selections"
              )}
            </Button>
            {hasSavedFabrics && (
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={handleDiscardFabrics}
                disabled={savingFabrics}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      ) : showCustomerSummary ? (
        <div className="mt-5">
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Primary fabric", value: displayFabric(savedPrimaryFabric) },
              { label: "Secondary material", value: displayFabric(savedSecondaryMaterial) },
              { label: "Lining", value: displayFabric(savedLining) },
            ].map((row) => (
              <div key={row.label} className="rounded-lg bg-background/40 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  {row.label}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-primary">{row.value}</dd>
              </div>
            ))}
          </dl>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => {
              resetFabricDraftFromProject();
              setEditingFabrics(true);
            }}
          >
            Update fabric selections
          </Button>
        </div>
      ) : (
        showReadOnlySummary && (
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Primary fabric", value: displayFabric(savedPrimaryFabric) },
              { label: "Secondary material", value: displayFabric(savedSecondaryMaterial) },
              { label: "Lining", value: displayFabric(savedLining) },
            ].map((row) => (
              <div key={row.label} className="rounded-lg bg-background/40 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  {row.label}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-primary">{row.value}</dd>
              </div>
            ))}
          </dl>
        )
      )}

      <div className="mt-6 rounded-lg border border-primary/10 bg-background/50 p-4">
        <div className="flex items-center gap-2 text-primary">
          <MessageSquareQuote className="h-4 w-4 text-accent" />
          <h4 className="text-sm font-semibold">Designer fabric advice</h4>
        </div>
        {canAdvise ? (
          showAdviceForm ? (
            <div className="mt-3 space-y-3">
              <TextArea
                id="designer-fabric-advice"
                rows={4}
                value={adviceDraft}
                placeholder="Suggest alternatives, sourcing notes, or construction guidance for your client…"
                onChange={(event) => setAdviceDraft(event.target.value)}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveAdvice}
                  disabled={savingAdvice}
                >
                  {savingAdvice ? "Saving…" : "Save advice for client"}
                </Button>
                {hasSavedAdvice && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDiscardAdvice}
                    disabled={savingAdvice}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : (
            showAdviceSummary && (
              <div className="mt-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-primary/85">
                  {savedAdvice}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    resetAdviceDraftFromProject();
                    setEditingAdvice(true);
                  }}
                >
                  Update fabric advice
                </Button>
              </div>
            )
          )
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-primary/75">
            {hasSavedAdvice
              ? savedAdvice
              : "Your designer has not shared fabric advice yet."}
          </p>
        )}
      </div>
    </section>
  );
}
