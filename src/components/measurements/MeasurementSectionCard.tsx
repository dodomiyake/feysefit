import type { MeasurementSectionDef, PreferredFit } from "@/lib/measurement-sections";
import { MeasurementField } from "./MeasurementField";
import { PreferredFitSelector } from "./PreferredFitSelector";

interface MeasurementSectionCardProps {
  section: MeasurementSectionDef;
  unitLabel: string;
  preferredFit?: PreferredFit;
  onPreferredFitChange?: (fit: PreferredFit) => void;
  values?: Record<string, string>;
  onFieldChange?: (key: string, value: string) => void;
  readOnly?: boolean;
}

export function MeasurementSectionCard({
  section,
  unitLabel,
  preferredFit,
  onPreferredFitChange,
  values = {},
  onFieldChange,
  readOnly = false,
}: MeasurementSectionCardProps) {
  const Icon = section.icon;

  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <Icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
        <h3 className="text-lg font-semibold text-primary">{section.title}</h3>
      </div>
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        {section.fields.map((field) => (
          <MeasurementField
            key={field.key}
            id={field.key}
            label={field.label}
            fieldNum={field.fieldNum}
            helper={field.helper}
            unitLabel={unitLabel}
            value={values[field.key] ?? ""}
            onChange={(value) => onFieldChange?.(field.key, value)}
            readOnly={readOnly}
          />
        ))}
        {section.showPreferredFit && onPreferredFitChange && (
          <PreferredFitSelector
            value={preferredFit ?? "regular"}
            onChange={onPreferredFitChange}
            readOnly={readOnly}
          />
        )}
      </div>
    </section>
  );
}
