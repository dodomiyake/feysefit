import Link from "next/link";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { LoginPageShell } from "@/components/auth/LoginPageShell";

type AccountRole = "designer" | "customer";

const COPY: Record<
  AccountRole,
  {
    mobileTitle: string;
    eyebrow: string;
    title: string;
    blurb: string;
    signupHref: string;
    loginHref: string;
    createLabel: string;
    signInLabel: string;
  }
> = {
  designer: {
    mobileTitle: "Designer account",
    eyebrow: "Designer access",
    title: "Your atelier account",
    blurb: "Create a designer profile or sign in to manage clients, projects, and commissions.",
    signupHref: "/signup/designer",
    loginHref: "/login?role=designer",
    createLabel: "Create designer account",
    signInLabel: "Sign in as designer",
  },
  customer: {
    mobileTitle: "Client account",
    eyebrow: "Client access",
    title: "Your client account",
    blurb: "Create a client account or sign in to share measurements, messages, and fitting updates.",
    signupHref: "/signup/client",
    loginHref: "/login?role=customer",
    createLabel: "Create client account",
    signInLabel: "Sign in as client",
  },
};

export function RoleAccountGate({ role }: { role: AccountRole }) {
  const copy = COPY[role];

  return (
    <LoginPageShell
      mobileTitle={copy.mobileTitle}
      eyebrow={copy.eyebrow}
      title={copy.title}
      footer={
        <p className="text-center text-sm text-zinc-600">
          Looking for the other path?{" "}
          <Link
            href={role === "designer" ? "/account/client" : "/account/designer"}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {role === "designer" ? "I’m a client" : "I’m a designer"}
          </Link>
        </p>
      }
    >
      <p className="mt-4 text-center text-sm leading-relaxed text-zinc-400">{copy.blurb}</p>

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href={copy.signupHref}
          className="group flex items-center justify-between rounded-lg bg-highlight px-5 py-4 text-sm font-semibold text-zinc-950 transition-transform active:scale-[0.99]"
        >
          <span className="inline-flex items-center gap-2">
            <UserPlus className="h-4 w-4" strokeWidth={1.75} />
            {copy.createLabel}
          </span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          href={copy.loginHref}
          className="group flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/60 px-5 py-4 text-sm font-semibold text-zinc-50 transition-colors hover:bg-zinc-800 active:scale-[0.99]"
        >
          <span className="inline-flex items-center gap-2">
            <LogIn className="h-4 w-4" strokeWidth={1.75} />
            {copy.signInLabel}
          </span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </LoginPageShell>
  );
}
