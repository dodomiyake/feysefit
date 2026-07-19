"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Project } from "@/lib/mock-data";
import {
  PAYMENT_METHOD_OPTIONS,
  computeBalanceRemaining,
  formatFittingDate,
  formatPaymentMethodLabel,
  hasFittingScheduleData,
  hasPaymentData,
} from "@/lib/local-customer";
import { updateProjectLocalOps } from "@/lib/services/localProjectService";
import { useApp } from "@/context/AppContext";

interface ProjectLocalOpsCardsProps {
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

export function ProjectLocalOpsCards({ project }: ProjectLocalOpsCardsProps) {
  const { refreshAppData, showToast } = useApp();
  const [saving, setSaving] = useState<"fitting" | "payment" | null>(null);

  const savedFittings = useMemo(
    () => ({
      firstFittingAt: project.firstFittingAt ?? "",
      secondFittingAt: project.secondFittingAt ?? "",
      finalFittingAt: project.finalFittingAt ?? "",
      fittingNotes: project.fittingNotes ?? "",
      adjustmentNotes: project.adjustmentNotes ?? "",
    }),
    [project]
  );
  const savedPayment = useMemo(
    () => ({
      totalPrice: project.totalPrice != null ? String(project.totalPrice) : "",
      depositPaid: project.depositPaid != null ? String(project.depositPaid) : "",
      paymentMethod: project.paymentMethod ?? "",
      paymentNotes: project.paymentNotes ?? "",
    }),
    [project]
  );

  const [firstFittingAt, setFirstFittingAt] = useState(savedFittings.firstFittingAt);
  const [secondFittingAt, setSecondFittingAt] = useState(savedFittings.secondFittingAt);
  const [finalFittingAt, setFinalFittingAt] = useState(savedFittings.finalFittingAt);
  const [fittingNotes, setFittingNotes] = useState(savedFittings.fittingNotes);
  const [adjustmentNotes, setAdjustmentNotes] = useState(savedFittings.adjustmentNotes);
  const [totalPrice, setTotalPrice] = useState(savedPayment.totalPrice);
  const [depositPaid, setDepositPaid] = useState(savedPayment.depositPaid);
  const [paymentMethod, setPaymentMethod] = useState(savedPayment.paymentMethod);
  const [paymentNotes, setPaymentNotes] = useState(savedPayment.paymentNotes);

  const [confirmedFittings, setConfirmedFittings] = useState<typeof savedFittings | null>(null);
  const [confirmedPayment, setConfirmedPayment] = useState<typeof savedPayment | null>(null);

  const displayFittings = confirmedFittings ?? savedFittings;
  const displayPayment = confirmedPayment ?? savedPayment;

  const hasSavedFittings = hasFittingScheduleData({
    firstFittingAt: displayFittings.firstFittingAt,
    secondFittingAt: displayFittings.secondFittingAt,
    finalFittingAt: displayFittings.finalFittingAt,
    fittingNotes: displayFittings.fittingNotes,
    adjustmentNotes: displayFittings.adjustmentNotes,
  });
  const hasSavedPayment = hasPaymentData({
    totalPrice: displayPayment.totalPrice ? Number.parseFloat(displayPayment.totalPrice) : undefined,
    depositPaid: displayPayment.depositPaid ? Number.parseFloat(displayPayment.depositPaid) : undefined,
    paymentMethod: displayPayment.paymentMethod,
    paymentNotes: displayPayment.paymentNotes,
  });

  const [editingFittings, setEditingFittings] = useState(() => !hasSavedFittings);
  const [editingPayment, setEditingPayment] = useState(() => !hasSavedPayment);
  const opsSyncKey = `${project.id}:${JSON.stringify(savedFittings)}:${JSON.stringify(savedPayment)}`;
  const [prevOpsSyncKey, setPrevOpsSyncKey] = useState(opsSyncKey);

  if (opsSyncKey !== prevOpsSyncKey) {
    setPrevOpsSyncKey(opsSyncKey);
    setConfirmedFittings(null);
    setConfirmedPayment(null);
    setFirstFittingAt(savedFittings.firstFittingAt);
    setSecondFittingAt(savedFittings.secondFittingAt);
    setFinalFittingAt(savedFittings.finalFittingAt);
    setFittingNotes(savedFittings.fittingNotes);
    setAdjustmentNotes(savedFittings.adjustmentNotes);
    setTotalPrice(savedPayment.totalPrice);
    setDepositPaid(savedPayment.depositPaid);
    setPaymentMethod(savedPayment.paymentMethod);
    setPaymentNotes(savedPayment.paymentNotes);
    setEditingFittings(!hasFittingScheduleData(savedFittings));
    setEditingPayment(!hasPaymentData({
      totalPrice: savedPayment.totalPrice ? Number.parseFloat(savedPayment.totalPrice) : undefined,
      depositPaid: savedPayment.depositPaid ? Number.parseFloat(savedPayment.depositPaid) : undefined,
      paymentMethod: savedPayment.paymentMethod,
      paymentNotes: savedPayment.paymentNotes,
    }));
  }

  const balance = useMemo(() => {
    const total = totalPrice ? Number.parseFloat(totalPrice) : undefined;
    const deposit = depositPaid ? Number.parseFloat(depositPaid) : undefined;
    return computeBalanceRemaining(total, deposit);
  }, [totalPrice, depositPaid]);

  const summaryBalance = computeBalanceRemaining(
    displayPayment.totalPrice ? Number.parseFloat(displayPayment.totalPrice) : undefined,
    displayPayment.depositPaid ? Number.parseFloat(displayPayment.depositPaid) : undefined
  );

  async function handleSave(section: "fitting" | "payment") {
    setSaving(section);
    try {
      if (section === "fitting") {
        const patch = { firstFittingAt, secondFittingAt, finalFittingAt, fittingNotes, adjustmentNotes };
        await updateProjectLocalOps(project.id, patch);
        setConfirmedFittings(patch);
        setEditingFittings(false);
      } else {
        const patch = {
          totalPrice: totalPrice ? Number.parseFloat(totalPrice) : undefined,
          depositPaid: depositPaid ? Number.parseFloat(depositPaid) : undefined,
          paymentMethod,
          paymentNotes,
        };
        await updateProjectLocalOps(project.id, patch);
        setConfirmedPayment({ totalPrice, depositPaid, paymentMethod, paymentNotes });
        setEditingPayment(false);
      }
      await refreshAppData();
      showToast("Saved — your client can see this on their project", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Save failed", "error");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-primary/10 bg-surface-container p-5">
        <h3 className="font-headline text-lg font-semibold text-primary">Fitting schedule</h3>
        {editingFittings || !hasSavedFittings ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: "First fitting", value: firstFittingAt, onChange: setFirstFittingAt },
                { label: "Second fitting", value: secondFittingAt, onChange: setSecondFittingAt },
                { label: "Final fitting", value: finalFittingAt, onChange: setFinalFittingAt },
              ].map((field) => (
                <label key={field.label} className="block text-sm">
                  <span className="mb-1 block text-primary/60">{field.label}</span>
                  <input
                    type="date"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
                  />
                </label>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-primary/60">Fitting notes</span>
                <textarea
                  value={fittingNotes}
                  onChange={(e) => setFittingNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-primary/60">Adjustment notes</span>
                <textarea
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                size="sm"
                disabled={saving === "fitting"}
                onClick={() => handleSave("fitting")}
              >
                {saving === "fitting" ? "Saving…" : "Save fittings"}
              </Button>
              {hasSavedFittings && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={saving === "fitting"}
                  onClick={() => {
                    setFirstFittingAt(displayFittings.firstFittingAt);
                    setSecondFittingAt(displayFittings.secondFittingAt);
                    setFinalFittingAt(displayFittings.finalFittingAt);
                    setFittingNotes(displayFittings.fittingNotes);
                    setAdjustmentNotes(displayFittings.adjustmentNotes);
                    setEditingFittings(false);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="mt-4">
            <dl className="grid gap-3 sm:grid-cols-3">
              <SummaryRow label="First fitting" value={formatFittingDate(displayFittings.firstFittingAt)} />
              <SummaryRow label="Second fitting" value={formatFittingDate(displayFittings.secondFittingAt)} />
              <SummaryRow label="Final fitting" value={formatFittingDate(displayFittings.finalFittingAt)} />
            </dl>
            {(displayFittings.fittingNotes || displayFittings.adjustmentNotes) && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {displayFittings.fittingNotes && (
                  <SummaryRow label="Fitting notes" value={displayFittings.fittingNotes} />
                )}
                {displayFittings.adjustmentNotes && (
                  <SummaryRow label="Adjustment notes" value={displayFittings.adjustmentNotes} />
                )}
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setEditingFittings(true)}
            >
              Update fittings
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-primary/10 bg-surface-container p-5">
        <h3 className="font-headline text-lg font-semibold text-primary">Payments</h3>
        {editingPayment || !hasSavedPayment ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-primary/60">Total price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                  className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-primary/60">Deposit paid</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositPaid}
                  onChange={(e) => setDepositPaid(e.target.value)}
                  className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-primary/60">Payment method</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
                >
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <option key={option.value || "none"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end text-sm">
                <p className="rounded-lg bg-background/70 px-3 py-2 text-primary">
                  Balance:{" "}
                  <span className="font-semibold">
                    {balance != null ? balance.toFixed(2) : "—"}
                  </span>
                </p>
              </div>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block text-primary/60">Payment notes</span>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-primary/15 bg-background px-3 py-2 text-primary"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                size="sm"
                disabled={saving === "payment"}
                onClick={() => handleSave("payment")}
              >
                {saving === "payment" ? "Saving…" : "Save payments"}
              </Button>
              {hasSavedPayment && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={saving === "payment"}
                  onClick={() => {
                    setTotalPrice(displayPayment.totalPrice);
                    setDepositPaid(displayPayment.depositPaid);
                    setPaymentMethod(displayPayment.paymentMethod);
                    setPaymentNotes(displayPayment.paymentNotes);
                    setEditingPayment(false);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="mt-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <SummaryRow
                label="Total price"
                value={
                  displayPayment.totalPrice
                    ? Number.parseFloat(displayPayment.totalPrice).toFixed(2)
                    : "—"
                }
              />
              <SummaryRow
                label="Deposit paid"
                value={
                  displayPayment.depositPaid
                    ? Number.parseFloat(displayPayment.depositPaid).toFixed(2)
                    : "—"
                }
              />
              <SummaryRow
                label="Balance"
                value={summaryBalance != null ? summaryBalance.toFixed(2) : "—"}
              />
              <SummaryRow
                label="Payment method"
                value={formatPaymentMethodLabel(displayPayment.paymentMethod)}
              />
            </dl>
            {displayPayment.paymentNotes && (
              <div className="mt-3">
                <SummaryRow label="Payment notes" value={displayPayment.paymentNotes} />
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setEditingPayment(true)}
            >
              Update payments
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
