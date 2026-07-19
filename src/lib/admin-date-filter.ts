export type DateRangePreset = "all" | "7d" | "30d" | "90d" | "custom";

export interface DateRangeFilter {
  preset: DateRangePreset;
  from?: string;
  to?: string;
}

export const dateRangePresetOptions: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function parseAdminDate(value: string | Date | undefined | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) return new Date(iso);

  const fallback = Date.parse(`${trimmed} 12:00:00 GMT`);
  return Number.isNaN(fallback) ? null : new Date(fallback);
}

export function getDateRangeBounds(filter: DateRangeFilter): {
  from: Date | null;
  to: Date | null;
} {
  if (filter.preset === "all") {
    return { from: null, to: null };
  }

  const now = new Date();
  const to = endOfDay(now);

  if (filter.preset === "custom") {
    const from = filter.from ? startOfDay(new Date(`${filter.from}T00:00:00`)) : null;
    const customTo = filter.to ? endOfDay(new Date(`${filter.to}T00:00:00`)) : null;
    return { from, to: customTo };
  }

  const days = filter.preset === "7d" ? 7 : filter.preset === "30d" ? 30 : 90;
  const from = startOfDay(new Date(now));
  from.setDate(from.getDate() - (days - 1));
  return { from, to };
}

export function isDateInRange(
  value: string | Date | undefined | null,
  filter: DateRangeFilter
): boolean {
  const date = parseAdminDate(value);
  if (!date) return filter.preset === "all";

  const { from, to } = getDateRangeBounds(filter);
  if (!from && !to) return true;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export function formatDateRangeLabel(filter: DateRangeFilter): string {
  const option = dateRangePresetOptions.find((entry) => entry.value === filter.preset);
  if (filter.preset !== "custom") {
    return option?.label ?? "All time";
  }
  if (filter.from && filter.to) return `${filter.from} – ${filter.to}`;
  if (filter.from) return `From ${filter.from}`;
  if (filter.to) return `Until ${filter.to}`;
  return "Custom range";
}
