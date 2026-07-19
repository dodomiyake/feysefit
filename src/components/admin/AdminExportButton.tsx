"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useReauth } from "@/context/ReauthContext";
import { exportCsv, type CsvColumn } from "@/lib/csv-export";

interface AdminExportButtonProps<T> {
  filename: string;
  columns: CsvColumn<T>[];
  rows: T[];
  disabled?: boolean;
  label?: string;
}

export function AdminExportButton<T>({
  filename,
  columns,
  rows,
  disabled,
  label = "Export CSV",
}: AdminExportButtonProps<T>) {
  const { ensureReauth } = useReauth();

  return (
    <Button
      type="button"
      variant="zinc"
      size="sm"
      className="gap-2"
      disabled={disabled || rows.length === 0}
      onClick={() => {
        void (async () => {
          const ok = await ensureReauth({
            purpose: "download customer or business records",
          });
          if (!ok) return;
          exportCsv(filename, columns, rows);
        })();
      }}
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
