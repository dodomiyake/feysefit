import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PREFERRED_FIT_OPTIONS } from "@/lib/measurement-sections";
import type { CustomerMeasurementProfile } from "@/lib/customer-measurements";
import { measurementSections } from "@/lib/measurement-sections";

interface MeasurementSubmittedStateProps {
  profile: Pick<CustomerMeasurementProfile, "unit" | "preferredFit" | "values" | "updatedAt">;
  dashboardHref: string;
  onEdit: () => void;
}

function labelForField(key: string) {
  for (const section of measurementSections) {
    const field = section.fields.find((item) => item.key === key);
    if (field) return field.label;
  }
  return key;
}

export function MeasurementSubmittedState({
  profile,
  dashboardHref,
  onEdit,
}: MeasurementSubmittedStateProps) {
  const unitLabel = profile.unit === "inches" ? "in" : "cm";
  const fitLabel =
    PREFERRED_FIT_OPTIONS.find((option) => option.value === profile.preferredFit)?.label ??
    profile.preferredFit;
  const filledEntries = Object.entries(profile.values).filter(([, value]) => value.trim().length > 0);

  return (
    <div className="space-y-6">
        <section className="rounded-xl border border-accent/25 bg-accent/5 p-6 shadow-warm lg:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-headline text-xl font-semibold text-primary">
                Measurements submitted
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Your measurement profile has been sent to your designer. They&apos;ll use these
                dimensions for fittings and production — you don&apos;t need to fill the form again
                unless your measurements change.
              </p>
              {profile.updatedAt && (
                <p className="mt-3 text-xs text-primary/45">Last submitted {profile.updatedAt}</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm lg:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-primary">Your submitted profile</h3>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-primary/60">
              <span className="rounded-full bg-background px-3 py-1">Unit: {unitLabel}</span>
              <span className="rounded-full bg-background px-3 py-1">Fit: {fitLabel}</span>
            </div>
          </div>

          {filledEntries.length > 0 ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              {filledEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg border border-primary/8 bg-background/50 px-4 py-3"
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-primary/45">
                    {labelForField(key)}
                  </dt>
                  <dd className="mt-1 font-medium text-primary">
                    {value} {unitLabel}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-ink-muted">No measurement values on file.</p>
          )}
        </section>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:gap-4">
          <Button variant="secondary" size="lg" className="flex-1 py-4" onClick={onEdit}>
            Update measurements
          </Button>
          <Link href={dashboardHref} className="flex-1 sm:flex-none">
            <Button variant="primary" size="lg" className="w-full px-8 py-4">
              Back to dashboard
            </Button>
          </Link>
        </div>
    </div>
  );
}
