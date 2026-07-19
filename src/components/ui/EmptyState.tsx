import { type LucideIcon } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-card p-12 text-center">
      <div className="rounded-full bg-highlight/10 p-5">
        <Icon className="h-8 w-8 text-accent" />
      </div>
      <h3 className="mt-4 font-headline text-xl font-semibold text-primary">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-primary/60">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
