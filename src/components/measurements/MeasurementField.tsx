interface MeasurementFieldProps {
  id: string;
  label: string;
  fieldNum?: string;
  helper?: string;
  unitLabel: string;
  value?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export function MeasurementField({
  id,
  label,
  fieldNum,
  helper,
  unitLabel,
  value = "",
  onChange,
  readOnly = false,
}: MeasurementFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex justify-between text-sm font-medium text-primary">
        <span>{label}</span>
        {fieldNum && (
          <span className="font-normal text-ink-muted/60">Field {fieldNum}</span>
        )}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type="number"
          step="0.1"
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="00.0"
          className="signup-field w-full rounded-lg border bg-background py-4 pl-5 pr-14 text-primary placeholder:text-primary/40 outline-none focus:outline-none read-only:cursor-default read-only:bg-background/70 read-only:text-primary/75"
        />
        <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted">
          {unitLabel}
        </span>
      </div>
      {helper && (
        <p className="text-xs italic text-ink-muted">{helper}</p>
      )}
    </div>
  );
}
