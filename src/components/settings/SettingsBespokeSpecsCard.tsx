import Link from "next/link";
import type { SettingsBespokeSpecs } from "@/lib/settings-profile";
import { formatUnitLabel } from "@/lib/settings-profile";
import { BadgeCheck } from "lucide-react";

interface SettingsBespokeSpecsCardProps {
  unit: "inches" | "cm";
  specs: SettingsBespokeSpecs;
  onUnitChange: (unit: "inches" | "cm") => void;
  fitProfileHref: string;
  fitProfileLabel?: string;
}

export function SettingsBespokeSpecsCard({
  unit,
  specs,
  onUnitChange,
  fitProfileHref,
  fitProfileLabel = "Update Fit Profile",
}: SettingsBespokeSpecsCardProps) {
  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md lg:col-span-4 lg:p-8">
      <div className="mb-6">
        <h2 className="font-headline text-xl font-semibold text-primary">Bespoke Specs</h2>
        <p className="mt-1 text-sm text-ink-muted">Default sizing for rapid prototyping</p>
      </div>

      <ul className="space-y-4">
        <li className="flex items-center justify-between border-b border-[#d3c3ba]/20 pb-3">
          <span className="text-sm text-ink-muted">Unit System</span>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            {formatUnitLabel(unit)}
          </span>
        </li>
        <li className="flex items-center justify-between border-b border-[#d3c3ba]/20 pb-3">
          <span className="text-sm text-ink-muted">Standard Size</span>
          <span className="text-sm font-medium text-primary">{specs.standardSize}</span>
        </li>
        <li className="flex items-center justify-between">
          <span className="text-sm text-ink-muted">Body Scan</span>
          {specs.bodyScanVerified ? (
            <span className="flex items-center gap-1 text-sm font-medium text-accent">
              Verified
              <BadgeCheck className="h-4 w-4" strokeWidth={2} />
            </span>
          ) : (
            <span className="text-sm text-ink-muted">Not verified</span>
          )}
        </li>
      </ul>

      <div className="mt-5 flex gap-2">
        {(["inches", "cm"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onUnitChange(option)}
            className={`flex-1 rounded-full py-2 text-xs font-medium transition-colors ${
              unit === option
                ? "bg-accent text-white"
                : "border border-[#d3c3ba]/30 bg-background text-ink-muted hover:text-primary"
            }`}
          >
            {option === "inches" ? "Inches" : "cm"}
          </button>
        ))}
      </div>

      <Link
        href={fitProfileHref}
        className="mt-6 block w-full rounded-full border border-primary py-2.5 text-center text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-background"
      >
        {fitProfileLabel}
      </Link>
    </section>
  );
}
