import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface AppointmentDayPdfRow {
  time: string;
  client: string;
  type: string;
  mode: string;
  status: string;
  notes: string;
}

export function downloadAppointmentDayPdf(input: {
  dayLabel: string;
  dayKey: string;
  designerName?: string;
  rows: AppointmentDayPdfRow[];
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const marginX = 14;
  let cursorY = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Appointments — ${input.dayLabel}`, marginX, cursorY);
  cursorY += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(85, 85, 85);
  const meta = [
    input.designerName?.trim(),
    `Generated ${new Date().toLocaleString("en-GB")}`,
    `${input.rows.length} client${input.rows.length === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");
  doc.text(meta, marginX, cursorY);
  cursorY += 6;
  doc.setTextColor(26, 9, 0);

  autoTable(doc, {
    startY: cursorY + 4,
    head: [["Time", "Client", "Type", "Mode", "Status", "Notes / reason"]],
    body: input.rows.map((row) => [
      row.time,
      row.client,
      row.type,
      row.mode,
      row.status,
      row.notes,
    ]),
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2.5,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: [245, 240, 235],
      textColor: [26, 9, 0],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 32 },
      2: { cellWidth: 28 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: "auto" },
    },
    margin: { left: marginX, right: marginX },
  });

  doc.save(`appointments-${input.dayKey}.pdf`);
}
