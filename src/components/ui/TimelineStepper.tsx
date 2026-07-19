import { cn } from "@/lib/cn";
import { Check } from "lucide-react";
import type { ProjectStatus } from "@/lib/design-tokens";
import { getProjectStatusIndex, projectStatuses } from "@/lib/project-timeline";

export function TimelineStepper({ currentStatus }: { currentStatus: ProjectStatus }) {
  const currentIndex = getProjectStatusIndex(currentStatus);

  return (
    <div className="space-y-0">
      {projectStatuses.map((status, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === projectStatuses.length - 1;

        return (
          <div key={status} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                  isComplete && "border-accent bg-accent text-white",
                  isCurrent && "border-accent bg-highlight/20 text-accent",
                  !isComplete && !isCurrent && "border-primary/20 text-primary/40"
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[32px]",
                    isComplete ? "bg-accent" : "bg-primary/10"
                  )}
                />
              )}
            </div>
            <div className={cn("pb-8", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium",
                  isCurrent ? "text-accent" : isComplete ? "text-primary" : "text-primary/40"
                )}
              >
                {status}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
