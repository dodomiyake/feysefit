import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface AdminFilterToolbarProps {
  children: ReactNode;
  exportButton?: ReactNode;
  gridClassName?: string;
  className?: string;
}

export function AdminFilterExportSlot({ children }: { children: ReactNode }) {
  return (
    <div className="shrink-0 space-y-1.5">
      <span className="block text-sm font-medium text-primary opacity-0 select-none" aria-hidden>
        Export
      </span>
      {children}
    </div>
  );
}

export function AdminFilterToolbar({
  children,
  exportButton,
  gridClassName = "grid min-w-0 flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4",
  className,
}: AdminFilterToolbarProps) {
  return (
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className={gridClassName}>{children}</div>
      {exportButton ? <AdminFilterExportSlot>{exportButton}</AdminFilterExportSlot> : null}
    </div>
  );
}
