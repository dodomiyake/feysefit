import { Sparkles } from "lucide-react";

export function ArtisanFocusCard() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-brand-dark p-6 text-white shadow-warm">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(245,158,11,0.35) 1px, transparent 1px)",
          backgroundSize: "12px 12px",
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Artisan Focus
          </p>
        </div>
        <blockquote className="mt-4 font-headline text-xl leading-relaxed text-zinc-100">
          &ldquo;Fashion is the armor to survive the reality of everyday life.&rdquo;
        </blockquote>
        <div className="mt-4 h-px w-12 bg-accent/60" />
        <p className="mt-4 text-xs font-medium uppercase tracking-widest text-accent">
          — Bill Cunningham
        </p>
      </div>
    </div>
  );
}
