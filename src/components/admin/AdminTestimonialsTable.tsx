"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { AdminExportButton } from "@/components/admin/AdminExportButton";
import { AdminFilterExportSlot, AdminFilterToolbar } from "@/components/admin/AdminFilterToolbar";
import { AdminSearchField } from "@/components/admin/AdminSearchField";
import { resolveOutfitTypeLabel } from "@/lib/testimonials";
import type { Testimonial, TestimonialReport } from "@/lib/testimonials";

export function AdminTestimonialsTable() {
  const {
    testimonials,
    testimonialReports,
    adminRemoveTestimonial,
    adminResolveTestimonialReport,
    showToast,
    refreshAppData,
  } = useApp();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return testimonials;
    return testimonials.filter((item) =>
      `${item.body} ${item.displayName} ${item.designerName ?? ""} ${item.projectTitle ?? ""}`
        .toLowerCase()
        .includes(normalized)
    );
  }, [testimonials, query]);

  const openReports = testimonialReports.filter((item) => item.status === "open");

  const exportColumns = [
    { header: "Designer", value: (row: Testimonial) => row.designerName ?? "" },
    { header: "Client", value: (row: Testimonial) => row.displayName },
    { header: "Rating", value: (row: Testimonial) => row.rating },
    { header: "Outfit", value: (row: Testimonial) => resolveOutfitTypeLabel(row.outfitType) },
    { header: "Public", value: (row: Testimonial) => (row.allowPublic ? "Yes" : "No") },
    { header: "Status", value: (row: Testimonial) => row.status },
    { header: "Review", value: (row: Testimonial) => row.body },
    { header: "Submitted", value: (row: Testimonial) => row.createdAt ?? "" },
  ];

  async function handleRemove(testimonialId: string) {
    if (!window.confirm("Remove this testimonial from the platform?")) return;
    setPending(`remove-${testimonialId}`);
    try {
      await adminRemoveTestimonial(testimonialId);
      await refreshAppData();
      showToast("Testimonial removed.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Action failed", "error");
    } finally {
      setPending(null);
    }
  }

  async function handleReportAction(report: TestimonialReport, status: "dismissed" | "resolved") {
    setPending(`report-${report.id}`);
    try {
      await adminResolveTestimonialReport(report.id, status);
      if (status === "resolved") {
        await adminRemoveTestimonial(report.testimonialId);
      }
      await refreshAppData();
      showToast(status === "dismissed" ? "Report dismissed." : "Report resolved and testimonial removed.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Action failed", "error");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-8">
      {openReports.length > 0 && (
        <section className="rounded-xl border border-amber-200/70 bg-amber-50/70 p-6">
          <h2 className="font-headline text-lg font-semibold text-primary">
            Reported testimonials ({openReports.length})
          </h2>
          <div className="mt-4 space-y-3">
            {openReports.map((report) => (
              <div key={report.id} className="rounded-lg border border-amber-200/60 bg-white/80 p-4 text-sm">
                <p className="font-medium text-primary">
                  {report.designerName ?? "Designer"} · {report.reason}
                </p>
                <p className="mt-1 text-primary/70">{report.detail || "No additional detail."}</p>
                {report.testimonialBody && (
                  <p className="mt-2 italic text-primary/60">&ldquo;{report.testimonialBody}&rdquo;</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending === `report-${report.id}`}
                    onClick={() => void handleReportAction(report, "resolved")}
                    className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white"
                  >
                    Remove testimonial
                  </button>
                  <button
                    type="button"
                    disabled={pending === `report-${report.id}`}
                    onClick={() => void handleReportAction(report, "dismissed")}
                    className="rounded-full border border-primary/15 px-4 py-1.5 text-xs font-medium text-primary"
                  >
                    Dismiss report
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl bg-surface-container p-6 shadow-sm">
        <AdminFilterToolbar
          className="mb-6"
          exportButton={
            <AdminFilterExportSlot>
              <AdminExportButton
                filename={`feysefit-testimonials-${new Date().toISOString().slice(0, 10)}`}
                columns={exportColumns}
                rows={filtered}
              />
            </AdminFilterExportSlot>
          }
        >
          <AdminSearchField
            id="testimonial-search"
            value={query}
            onChange={setQuery}
            placeholder="Search designer, client, or review text…"
          />
        </AdminFilterToolbar>

        {filtered.length === 0 ? (
          <p className="text-sm text-primary/50">No testimonials match your search.</p>
        ) : (
          <div className="w-full overflow-x-auto rounded-lg border border-primary/10">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
                <col className="w-[12%]" />
                <col className="w-[34%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead className="bg-card text-xs uppercase tracking-wide text-primary/55">
                <tr>
                  <th className="px-4 py-3 font-semibold">Designer</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Rating</th>
                  <th className="px-4 py-3 font-semibold">Outfit</th>
                  <th className="px-4 py-3 font-semibold">Testimonial</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/8 bg-background/50">
                {filtered.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3 text-primary/75">{item.designerName ?? "—"}</td>
                    <td className="px-4 py-3 text-primary/75">{item.displayName}</td>
                    <td className="px-4 py-3 text-primary/75">{item.rating}/5</td>
                    <td className="px-4 py-3 text-primary/65">
                      {resolveOutfitTypeLabel(item.outfitType)}
                    </td>
                    <td className="px-4 py-3 text-primary/80">{item.body}</td>
                    <td className="px-4 py-3 text-primary/60">
                      {item.status}
                      {!item.allowPublic && <span className="block text-xs">Private</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={pending === `remove-${item.id}`}
                        onClick={() => void handleRemove(item.id)}
                        className="text-xs font-semibold text-red-700 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
