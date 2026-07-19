import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackButton } from "@/components/ui/BackButton";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface LoginPageShellProps {
  mobileTitle: string;
  backHref?: string;
  backLabel?: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function LoginPageShell({
  mobileTitle,
  backHref = "/",
  backLabel = "Back to home",
  eyebrow,
  title,
  children,
  footer,
}: LoginPageShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#faf6ef]">
      <div className="pointer-events-none fixed bottom-8 right-8 z-0 select-none text-right opacity-10 lg:bottom-16 lg:right-16">
        <p className="text-xs font-semibold uppercase tracking-[0.5em] text-primary">
          Lagos
          <br />
          Abuja
          <br />
          Paris
          <br />
          Milan
          <br />
          London
        </p>
      </div>

      <div className="lg:hidden">
        <TopBar title={mobileTitle} showBack backHref={backHref} />
      </div>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-10 lg:px-16 lg:py-12">
        <div className="signup-fade-in w-full max-w-[500px] space-y-6">
          <BackButton href={backHref} label={backLabel} className="mb-2 hidden text-sm lg:inline-flex" />

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.24)] transition-transform duration-300 hover:-translate-y-0.5 lg:p-10">
            <header className="space-y-3 text-center">
              <BrandLogo onDark className="text-2xl font-extrabold tracking-tight" />
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">{eyebrow}</p>
              <h1 className="pt-1 font-headline text-2xl font-semibold text-zinc-50">{title}</h1>
            </header>

            {children}
          </div>

          {footer}
        </div>
      </main>

      <SiteFooter variant="auth" className="relative z-10" />
    </div>
  );
}

interface LoginPortalLinkProps {
  href: string;
  children: React.ReactNode;
}

export function LoginPortalLink({ href, children }: LoginPortalLinkProps) {
  return (
    <p className="text-center text-sm text-zinc-600">
      <Link href={href} className="font-semibold text-primary/70 underline-offset-4 hover:text-primary hover:underline">
        {children}
      </Link>
    </p>
  );
}
