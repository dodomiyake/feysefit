import { PREFERRED_FIT_OPTIONS, type PreferredFit } from "@/lib/measurement-sections";
import { cn } from "@/lib/cn";

interface PreferredFitSelectorProps {
  value: PreferredFit;
  onChange: (fit: PreferredFit) => void;
  readOnly?: boolean;
}

export function PreferredFitSelector({ value, onChange, readOnly = false }: PreferredFitSelectorProps) {
  return (
    <div className="space-y-3 md:col-span-2">
      <p className="text-sm font-medium text-primary">Preferred Fit</p>
      <div className="grid grid-cols-3 gap-3">
        {PREFERRED_FIT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg border py-3 text-sm font-medium transition-all",
              readOnly && "cursor-default opacity-90",
              value === option.value
                ? "border-accent bg-accent/15 text-primary"
                : "border-[#d3c3ba] bg-background text-ink-muted hover:border-accent/40 hover:text-primary"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
