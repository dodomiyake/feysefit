import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/ui/BrandLogo";

export const sidebarShellClass =
  "fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-white/5 bg-brand-dark py-6 shadow-lg lg:flex";

export const sidebarLogoutClass =
  "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-red-300";

export function sidebarNavClass(isActive: boolean) {
  return cn(
    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
    isActive
      ? "border-r-2 border-accent bg-accent/15 font-bold text-white"
      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
  );
}

export function SidebarCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-brand-dark">
      {count}
    </span>
  );
}

interface AppSidebarProps {
  tagline: string;
  children: ReactNode;
  footer?: ReactNode;
  navClassName?: string;
}

export function AppSidebar({ tagline, children, footer, navClassName }: AppSidebarProps) {
  return (
    <aside className={sidebarShellClass}>
      <div className="mb-8 px-6">
        <Link href="/" className="block">
          <BrandLogo onDark className="text-2xl" />
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {tagline}
          </span>
        </Link>
      </div>

      <nav className={cn("flex-1 space-y-1 px-4", navClassName)}>{children}</nav>

      {footer ? <div className="mt-auto space-y-4 px-4 pb-6">{footer}</div> : null}
    </aside>
  );
}
