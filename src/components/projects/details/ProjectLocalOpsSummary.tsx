"use client";

import type { Project } from "@/lib/mock-data";
import {
  computeBalanceRemaining,
  formatFittingDate,
  formatPaymentMethodLabel,
  hasFittingScheduleData,
  hasPaymentData,
  hasVisibleLocalOps,
} from "@/lib/local-customer";

interface ProjectLocalOpsSummaryProps {
  project: Project;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/40 px-3 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-primary">{value}</dd>
    </div>
  );
}

function NoteBlock({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <div className="mt-3 rounded-lg bg-background/40 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-primary/85">{value}</p>
    </div>
  );
}

export function ProjectLocalOpsSummary({ project }: ProjectLocalOpsSummaryProps) {
  if (!hasVisibleLocalOps(project)) return null;

  const balance = computeBalanceRemaining(project.totalPrice, project.depositPaid);

  return (
    <div className="space-y-5">
      {hasFittingScheduleData(project) && (
        <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-5 shadow-warm">
          <h3 className="font-headline text-lg font-semibold text-primary">Fitting schedule</h3>
          <p className="mt-1 text-sm text-primary/60">
            Dates and notes from your designer for in-person fittings.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <SummaryRow label="First fitting" value={formatFittingDate(project.firstFittingAt)} />
            <SummaryRow label="Second fitting" value={formatFittingDate(project.secondFittingAt)} />
            <SummaryRow label="Final fitting" value={formatFittingDate(project.finalFittingAt)} />
          </dl>
          <NoteBlock label="Fitting notes" value={project.fittingNotes} />
          <NoteBlock label="Adjustment notes" value={project.adjustmentNotes} />
        </section>
      )}

      {hasPaymentData(project) && (
        <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-5 shadow-warm">
          <h3 className="font-headline text-lg font-semibold text-primary">Payments</h3>
          <p className="mt-1 text-sm text-primary/60">Price, deposit, and balance tracked by your designer.</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <SummaryRow
              label="Total price"
              value={project.totalPrice != null ? project.totalPrice.toFixed(2) : "—"}
            />
            <SummaryRow
              label="Deposit paid"
              value={project.depositPaid != null ? project.depositPaid.toFixed(2) : "—"}
            />
            <SummaryRow
              label="Balance remaining"
              value={balance != null ? balance.toFixed(2) : "—"}
            />
            <SummaryRow
              label="Payment method"
              value={formatPaymentMethodLabel(project.paymentMethod)}
            />
          </dl>
          <NoteBlock label="Payment notes" value={project.paymentNotes} />
        </section>
      )}
    </div>
  );
}

export { hasVisibleLocalOps };
