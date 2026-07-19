import { cn } from "@/lib/cn";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "zinc" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" && "px-4 py-2 text-sm",
        size === "md" && "px-6 py-3 text-sm",
        size === "lg" && "px-8 py-3.5 text-base",
        variant === "primary" &&
          "rounded-full bg-accent text-white shadow-sm hover:bg-[#9a7201] active:scale-[0.98]",
        variant === "zinc" &&
          "rounded-full bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 active:scale-[0.98]",
        variant === "secondary" &&
          "rounded-full border border-primary/20 bg-transparent text-primary hover:bg-primary/5",
        variant === "ghost" &&
          "rounded-full text-primary underline-offset-4 hover:underline",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";
