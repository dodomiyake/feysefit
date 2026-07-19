import Link from "next/link";
import { Monitor } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { cn } from "@/lib/cn";

interface AdminDesktopOnlyGateProps {
  children: React.ReactNode;
}

export function AdminDesktopOnlyGate({ children }: AdminDesktopOnlyGateProps) {
  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-center lg:hidden">
        <BrandLogo className="text-3xl" />
        <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 text-primary">
          <Monitor className="h-7 w-7" strokeWidth={1.75} />
        </div>
        <h1 className="mt-6 font-headline text-2xl font-bold text-primary">Desktop only</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-primary/60">
          The FeyseFit admin console is built for larger screens. Open this page on a laptop or
          desktop to manage the platform.
        </p>
        <Link
          href="/"
          className={cn(
            "mt-8 inline-flex items-center justify-center rounded-full border border-primary/20 bg-transparent px-4 py-2 text-sm font-medium text-primary transition-all hover:bg-primary/5"
          )}
        >
          Back to home
        </Link>
      </div>
      <div className="hidden lg:contents">{children}</div>
    </>
  );
}
