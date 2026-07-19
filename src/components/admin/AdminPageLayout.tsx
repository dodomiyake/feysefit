import { AppShell } from "@/components/layout/AppShell";
import { DesktopBackNav } from "@/components/ui/BackButton";
import type { ReactNode } from "react";

interface AdminPageLayoutProps {
  title: string;
  description?: string;
  mobileTitle?: string;
  backHref?: string;
  backLabel?: string;
  headerAction?: ReactNode;
  children: React.ReactNode;
}

export function AdminPageLayout({
  title,
  description,
  mobileTitle,
  backHref = "/dashboard/admin",
  backLabel = "Back to overview",
  headerAction,
  children,
}: AdminPageLayoutProps) {
  return (
    <AppShell mobileTitle={mobileTitle ?? title} showMobileTopBar mobileBackHref={backHref}>
      <div className="mx-auto w-full max-w-none px-5 pb-10 pt-6 lg:px-10 lg:pb-12 xl:px-12">
        <DesktopBackNav href={backHref} label={backLabel} />
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary lg:text-3xl">{title}</h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary/60 lg:text-base">
                {description}
              </p>
            )}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
        {children}
      </div>
    </AppShell>
  );
}
