"use client";

import type { DateRangeFilter, DateRangePreset } from "@/lib/admin-date-filter";
import { dateRangePresetOptions } from "@/lib/admin-date-filter";
import { Select } from "@/components/ui/Select";

interface AdminDateRangeFilterProps {
  value: DateRangeFilter;
  onChange: (value: DateRangeFilter) => void;
  label?: string;
  className?: string;
}

export function AdminDateRangeFilter({
  value,
  onChange,
  label = "Date range",
  className,
}: AdminDateRangeFilterProps) {
  return (
    <div className={className}>
      <Select
        label={label}
        options={dateRangePresetOptions}
        value={value.preset}
        onChange={(event) =>
          onChange({
            ...value,
            preset: event.target.value as DateRangePreset,
          })
        }
      />
      {value.preset === "custom" && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="admin-date-from" className="mb-1 block text-xs font-medium text-primary/55">
              From
            </label>
            <input
              id="admin-date-from"
              type="date"
              value={value.from ?? ""}
              onChange={(event) => onChange({ ...value, from: event.target.value || undefined })}
              className="w-full rounded-lg border border-primary/10 bg-card px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div>
            <label htmlFor="admin-date-to" className="mb-1 block text-xs font-medium text-primary/55">
              To
            </label>
            <input
              id="admin-date-to"
              type="date"
              value={value.to ?? ""}
              onChange={(event) => onChange({ ...value, to: event.target.value || undefined })}
              className="w-full rounded-lg border border-primary/10 bg-card px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </div>
      )}
    </div>
  );
}
