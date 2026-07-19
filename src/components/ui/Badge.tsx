import { cn } from "@/lib/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "gold" | "outline";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase",
        variant === "default" && "bg-highlight/15 text-primary",
        variant === "gold" && "bg-accent text-white",
        variant === "outline" && "border border-primary/20 text-primary",
        className
      )}
    >
      {children}
    </span>
  );
}
