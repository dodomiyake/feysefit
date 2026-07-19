"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { NotificationButton } from "@/components/ui/NotificationButton";

interface TopBarProps {
  title: string;
  showBack?: boolean;
  showLogo?: boolean;
  backHref?: string;
}

export function TopBar({ title, showBack, showLogo, backHref }: TopBarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-primary/10 bg-background/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {showBack &&
            (backHref ? (
              <Link
                href={backHref}
                className="shrink-0 rounded-full p-2 text-primary hover:bg-primary/5"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => router.back()}
                className="shrink-0 rounded-full p-2 text-primary hover:bg-primary/5"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ))}
          {showLogo ? (
            <Link href="/">
              <BrandLogo className="text-xl" />
            </Link>
          ) : (
            <h1 className="truncate font-headline text-lg font-semibold text-primary">{title}</h1>
          )}
        </div>
        <NotificationButton variant="mobile" />
      </div>
    </header>
  );
}
