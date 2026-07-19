import { commissionDefaults } from "@/lib/design-tokens";

interface PaletteSwatchesProps {
  colors: string[];
  labels?: string[];
  size?: "sm" | "md";
}

export function PaletteSwatches({ colors, labels, size = "md" }: PaletteSwatchesProps) {
  const dot = size === "sm" ? "h-6 w-6" : "h-8 w-8";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {colors.map((color, index) => (
        <div key={`${color}-${index}`} className="flex flex-col items-center gap-1">
          <div
            className={`${dot} rounded-full border border-primary/10 shadow-sm ring-2 ring-background`}
            style={{ backgroundColor: color }}
            title={labels?.[index] ?? color}
          />
          {labels?.[index] && size === "md" && (
            <span className="max-w-[4rem] truncate text-[10px] text-primary/50">{labels[index]}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function CommissionDefaultsPreview() {
  return (
    <div className="rounded-xl border border-primary/10 bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary/50">
        Commission color defaults
      </p>
      <p className="mt-1 text-sm text-primary/60">
        New design requests start with these preset accents.
      </p>
      <div className="mt-4 flex flex-wrap gap-6">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg border border-primary/10 shadow-sm"
            style={{ backgroundColor: commissionDefaults.primaryAccent }}
          />
          <div>
            <p className="text-xs font-medium text-primary/50">Primary Accent</p>
            <p className="font-mono text-sm text-primary">{commissionDefaults.primaryAccent}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg border border-primary/10 shadow-sm"
            style={{ backgroundColor: commissionDefaults.secondaryAccent }}
          />
          <div>
            <p className="text-xs font-medium text-primary/50">Secondary Accent</p>
            <p className="font-mono text-sm text-primary">{commissionDefaults.secondaryAccent}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
