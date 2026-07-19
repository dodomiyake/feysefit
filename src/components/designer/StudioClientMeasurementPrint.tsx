"use client";

import { useRef } from "react";
import type { StudioClient } from "@/lib/studio-client";
import { countStudioClientMeasurements } from "@/lib/studio-client";
import { measurementSections } from "@/lib/measurement-sections";
import { formatRecordedBy } from "@/lib/local-customer";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useReauth } from "@/context/ReauthContext";

interface StudioClientMeasurementPrintProps {
  client: StudioClient;
  designerName?: string;
}

export function StudioClientMeasurementPrint({
  client,
  designerName,
}: StudioClientMeasurementPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { ensureReauth } = useReauth();
  const measureCount = countStudioClientMeasurements(client);

  async function handlePrint() {
    const ok = await ensureReauth({ purpose: "export customer measurements" });
    if (!ok) return;

    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Measurements — ${client.name}</title>
          <style>
            body { font-family: Georgia, serif; padding: 32px; color: #1a1a1a; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .meta { font-size: 13px; color: #555; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-size: 13px; }
            th { background: #f5f0eb; }
            .section { margin-top: 20px; }
            .section h2 { font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  if (measureCount === 0) return null;

  const unitLabel = client.unit === "cm" ? "cm" : "in";

  return (
    <div className="rounded-xl border border-primary/10 bg-surface-container p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-headline text-lg font-semibold text-primary">Measurement sheet</h2>
          <p className="mt-1 text-sm text-primary/60">Print or save as PDF for fittings and production.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" className="gap-2" onClick={() => void handlePrint()}>
          <Printer className="h-4 w-4" />
          Print / export
        </Button>
      </div>

      <div ref={printRef} className="sr-only" aria-hidden>
        <h1>{client.name}</h1>
        <p className="meta">
          {designerName ? `${designerName} · ` : ""}
          {formatRecordedBy(client.measurementRecordedBy)} · Unit: {client.unit} · Preferred fit:{" "}
          {client.preferredFit}
          {client.phone ? ` · ${client.phone}` : ""}
        </p>
        {measurementSections.map((section) => {
          const rows = section.fields.filter((field) => client.measurementValues[field.key]?.trim());
          if (!rows.length) return null;
          return (
            <div key={section.title} className="section">
              <h2>{section.title}</h2>
              <table>
                <thead>
                  <tr>
                    <th>Measurement</th>
                    <th>Value ({unitLabel})</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((field) => (
                    <tr key={field.key}>
                      <td>{field.label}</td>
                      <td>{client.measurementValues[field.key]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
