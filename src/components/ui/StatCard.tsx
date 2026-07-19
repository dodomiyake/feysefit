import { cn } from "@/lib/cn";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-card p-6 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/60">{label}</p>
          <p className="mt-2 font-headline text-3xl font-semibold text-primary">{value}</p>
          {trend && <p className="mt-1 text-xs text-accent">{trend}</p>}
        </div>
        <div className="rounded-full bg-highlight/15 p-3">
          <Icon className="h-5 w-5 text-accent" />
        </div>
      </div>
    </div>
  );
}
