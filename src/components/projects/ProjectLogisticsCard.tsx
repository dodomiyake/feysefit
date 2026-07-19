import { Calendar, Info } from "lucide-react";

export function ProjectLogisticsCard() {
  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md lg:p-8">
      <h3 className="mb-6 text-lg font-semibold text-primary">Logistics</h3>
      <div className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="deadline" className="block text-sm font-medium text-ink-muted">
            Target Deadline
          </label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted/60" />
            <input
              id="deadline"
              name="deadline"
              type="date"
              className="signup-field w-full rounded-lg border py-4 pl-12 pr-4 text-primary outline-none focus:outline-none"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="budget" className="block text-sm font-medium text-ink-muted">
            Budget Allocation ($)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-muted">
              USD
            </span>
            <input
              id="budget"
              name="budget"
              type="number"
              step="0.01"
              min="0"
              placeholder="5,000.00"
              className="signup-field w-full rounded-lg border py-4 pl-14 pr-4 text-primary placeholder:text-primary/40 outline-none focus:outline-none"
            />
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-highlight/30 bg-highlight/10 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <p className="text-xs leading-relaxed text-primary/80">
            Standard processing time for Bespoke is 6–8 weeks.
          </p>
        </div>
      </div>
    </section>
  );
}
