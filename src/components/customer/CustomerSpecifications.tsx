import { Palette, Layers, CreditCard } from "lucide-react";
import type { Project } from "@/lib/mock-data";
import { getProjectPalette } from "@/lib/project-palettes";
import { PaletteSwatches } from "@/components/ui/PaletteSwatches";

export function CustomerSpecifications({ project }: { project: Project }) {
  const palette = getProjectPalette(project.paletteId);

  const specs = [
    {
      icon: Palette,
      label: "Fabric Palette",
      value: palette ? palette.name : "Custom palette",
      palette,
    },
    {
      icon: Layers,
      label: "Primary Material",
      value: "Premium Silk Blend",
    },
    {
      icon: CreditCard,
      label: "Payment Status",
      value: `Deposit Paid (${project.budget})`,
      highlight: true,
    },
  ];

  return (
    <section className="rounded-xl border border-primary/8 bg-card p-6 shadow-sm">
      <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
        Specifications
      </h4>
      <ul className="space-y-5">
        {specs.map((spec) => (
          <li key={spec.label} className="flex items-start gap-3">
            <spec.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary">{spec.label}</p>
              <p
                className={
                  spec.highlight ? "text-xs font-semibold text-accent" : "text-xs text-primary/55"
                }
              >
                {spec.value}
              </p>
              {spec.palette && (
                <div className="mt-3">
                  <PaletteSwatches colors={[...spec.palette.colors]} labels={[...spec.palette.labels]} size="sm" />
                  <p className="mt-2 font-mono text-[10px] text-primary/40">{project.projectCode}</p>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
