import Link from "next/link";
import { UserPlus, PenTool, Ruler, MessageSquare, type LucideIcon } from "lucide-react";

const actions: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/invite", label: "Invite Client", icon: UserPlus },
  { href: "/projects/new", label: "Create Project", icon: PenTool },
  { href: "/clients/measurements", label: "View Measurements", icon: Ruler },
  { href: "/messages", label: "Message Client", icon: MessageSquare },
];

export function QuickActionGrid() {
  return (
    <section className="rounded-xl bg-surface-container p-6">
      <h2 className="font-headline text-lg font-semibold text-primary">Quick Actions</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="group flex flex-col items-center gap-2 rounded-lg border border-primary/10 bg-background p-4 transition-colors hover:border-accent/40 hover:bg-accent/5"
          >
            <action.icon className="h-5 w-5 text-accent" />
            <span className="text-center text-xs font-semibold text-primary/80">{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
