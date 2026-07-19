"use client";

import { useMemo, useState } from "react";
import type { StudioClient } from "@/lib/studio-client";
import type { PreferredFit } from "@/lib/measurement-sections";
import {
  measurementSections,
  PREFERRED_FIT_OPTIONS,
} from "@/lib/measurement-sections";
import { MeasurementSectionCard } from "@/components/measurements/MeasurementSectionCard";
import { Button } from "@/components/ui/Button";
import { saveStudioClientMeasurements, updateStudioClientProfile } from "@/lib/services/studioClientService";

interface StudioClientMeasurementsEditorProps {
  designerId: string;
  client: StudioClient;
  onSaved: (client: StudioClient) => void;
  onError: (message: string) => void;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/40 px-3 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-primary/50">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-primary">{value || "—"}</dd>
    </div>
  );
}

function formatPreferredFit(fit: PreferredFit) {
  return PREFERRED_FIT_OPTIONS.find((option) => option.value === fit)?.label ?? fit;
}

function hasStudioMeasurementData(client: StudioClient) {
  return (
    !!client.measurementUpdatedAt ||
    Object.values(client.measurementValues).some((value) => value.trim().length > 0)
  );
}

export function StudioClientMeasurementsEditor({
  designerId,
  client,
  onSaved,
  onError,
}: StudioClientMeasurementsEditorProps) {
  const saved = useMemo(
    () => ({
      unit: client.unit,
      preferredFit: client.preferredFit,
      values: client.measurementValues,
      measurementUpdatedAt: client.measurementUpdatedAt,
      lastFittingAt: client.lastFittingAt,
    }),
    [client]
  );

  const [unit, setUnit] = useState(saved.unit);
  const [preferredFit, setPreferredFit] = useState(saved.preferredFit);
  const [values, setValues] = useState(saved.values);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(() => !hasStudioMeasurementData(client));
  const [display, setDisplay] = useState(saved);
  const [syncKey, setSyncKey] = useState(client.id);

  if (client.id !== syncKey) {
    setSyncKey(client.id);
    setUnit(saved.unit);
    setPreferredFit(saved.preferredFit);
    setValues(saved.values);
    setDisplay(saved);
    setEditing(!hasStudioMeasurementData(client));
  } else if (
    saved.unit !== display.unit ||
    saved.preferredFit !== display.preferredFit ||
    saved.measurementUpdatedAt !== display.measurementUpdatedAt
  ) {
    // External client data refresh for the same client — resync draft/display.
    setUnit(saved.unit);
    setPreferredFit(saved.preferredFit);
    setValues(saved.values);
    setDisplay(saved);
  }

  const unitLabel = unit === "cm" ? "cm" : "in";
  const displayUnitLabel = display.unit === "cm" ? "cm" : "in";

  function resetDraft() {
    setUnit(display.unit);
    setPreferredFit(display.preferredFit);
    setValues(display.values);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await saveStudioClientMeasurements(designerId, client.id, {
        unit,
        preferredFit,
        measurementValues: values,
        measurementRecordedBy: "designer",
        lastFittingAt: new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      });
      const nextDisplay = {
        unit: updated.unit,
        preferredFit: updated.preferredFit,
        values: updated.measurementValues,
        measurementUpdatedAt: updated.measurementUpdatedAt,
        lastFittingAt: updated.lastFittingAt,
      };
      setDisplay(nextDisplay);
      setEditing(false);
      onSaved(updated);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to save measurements");
    } finally {
      setSaving(false);
    }
  }

  const hasSaved = hasStudioMeasurementData({
    ...client,
    unit: display.unit,
    preferredFit: display.preferredFit,
    measurementValues: display.values,
    measurementUpdatedAt: display.measurementUpdatedAt,
    lastFittingAt: display.lastFittingAt,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-headline text-xl font-semibold text-primary">In-person measurements</h2>
          <p className="mt-1 text-sm text-primary/60">
            Record measurements during a studio visit. Saved as designer-recorded.
          </p>
          {hasSaved && display.measurementUpdatedAt && !editing && (
            <p className="mt-1 text-xs text-primary/45">
              Last saved {new Date(display.measurementUpdatedAt).toLocaleString("en-GB")}
            </p>
          )}
        </div>
        {hasSaved && !editing && (
          <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Update measurements
          </Button>
        )}
      </div>

      {editing || !hasSaved ? (
        <>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as "inches" | "cm")}
              className="rounded-full border border-primary/15 bg-background px-3 py-2 text-sm text-primary"
            >
              <option value="inches">Inches</option>
              <option value="cm">Centimetres</option>
            </select>
          </div>

          {measurementSections.map((section) => (
            <MeasurementSectionCard
              key={section.title}
              section={section}
              unitLabel={unitLabel}
              preferredFit={preferredFit}
              onPreferredFitChange={setPreferredFit}
              values={values}
              onFieldChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
            />
          ))}

          <div className="flex flex-wrap gap-3">
            <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save measurements"}
            </Button>
            {hasSaved && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  resetDraft();
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-3">
            <SummaryRow label="Unit" value={display.unit === "cm" ? "Centimetres" : "Inches"} />
            <SummaryRow label="Preferred fit" value={formatPreferredFit(display.preferredFit)} />
            <SummaryRow label="Last fitting" value={display.lastFittingAt ?? "—"} />
          </dl>

          {measurementSections.map((section) => {
            const filledFields = section.fields.filter((field) =>
              display.values[field.key]?.trim()
            );
            if (filledFields.length === 0) return null;

            const Icon = section.icon;
            return (
              <section
                key={section.title}
                className="rounded-xl border border-primary/10 bg-surface-container p-6"
              >
                <div className="mb-4 flex items-center gap-3">
                  <Icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
                  <h3 className="text-lg font-semibold text-primary">{section.title}</h3>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {filledFields.map((field) => (
                    <SummaryRow
                      key={field.key}
                      label={field.label}
                      value={`${display.values[field.key]} ${displayUnitLabel}`}
                    />
                  ))}
                </dl>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

interface StudioClientProfileFieldsProps {
  designerId: string;
  client: StudioClient;
  onSaved: (client: StudioClient) => void;
  onError: (message: string) => void;
}

export function StudioClientProfileFields({
  designerId,
  client,
  onSaved,
  onError,
}: StudioClientProfileFieldsProps) {
  const saved = useMemo(
    () => ({
      name: client.name,
      phone: client.phone,
      email: client.email,
      location: client.location,
      notes: client.notes,
    }),
    [client]
  );

  const [name, setName] = useState(saved.name);
  const [phone, setPhone] = useState(saved.phone);
  const [email, setEmail] = useState(saved.email);
  const [location, setLocation] = useState(saved.location);
  const [notes, setNotes] = useState(saved.notes);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [display, setDisplay] = useState(saved);
  const [syncKey, setSyncKey] = useState(client.id);

  if (client.id !== syncKey) {
    setSyncKey(client.id);
    setName(saved.name);
    setPhone(saved.phone);
    setEmail(saved.email);
    setLocation(saved.location);
    setNotes(saved.notes);
    setDisplay(saved);
    setEditing(false);
  } else if (
    saved.name !== display.name ||
    saved.phone !== display.phone ||
    saved.email !== display.email ||
    saved.location !== display.location ||
    saved.notes !== display.notes
  ) {
    setName(saved.name);
    setPhone(saved.phone);
    setEmail(saved.email);
    setLocation(saved.location);
    setNotes(saved.notes);
    setDisplay(saved);
  }

  function resetDraft() {
    setName(display.name);
    setPhone(display.phone);
    setEmail(display.email);
    setLocation(display.location);
    setNotes(display.notes);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateStudioClientProfile(designerId, client.id, {
        name,
        phone,
        email,
        location,
        notes,
      });
      const nextDisplay = {
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        location: updated.location,
        notes: updated.notes,
      };
      setDisplay(nextDisplay);
      setEditing(false);
      onSaved(updated);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-primary/10 bg-surface-container p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-headline text-lg font-semibold text-primary">Contact details</h2>
        {!editing && (
          <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Update details
          </Button>
        )}
      </div>

      {editing ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-primary/60">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-primary/60">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-primary/60">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-primary/60">Location</span>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-primary/60">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save contact details"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={saving}
              onClick={() => {
                resetDraft();
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <SummaryRow label="Name" value={display.name} />
          <SummaryRow label="Phone" value={display.phone} />
          <SummaryRow label="Email" value={display.email} />
          <SummaryRow label="Location" value={display.location} />
          <div className="sm:col-span-2">
            <SummaryRow label="Notes" value={display.notes} />
          </div>
        </dl>
      )}
    </div>
  );
}
