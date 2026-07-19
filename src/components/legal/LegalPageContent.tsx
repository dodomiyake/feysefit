import Link from "next/link";
import { BackButton } from "@/components/ui/BackButton";

interface LegalSection {
  title: string;
  body: string[];
}

interface LegalPageContentProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export function LegalPageContent({
  title,
  subtitle,
  lastUpdated,
  sections,
}: LegalPageContentProps) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 lg:px-16 lg:py-14">
      <BackButton href="/" label="Back to home" className="mb-6" />
      <header className="mb-10 border-b border-primary/10 pb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/45">
          Legal
        </p>
        <h1 className="mt-2 font-headline text-3xl font-bold text-primary lg:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{subtitle}</p>
        <p className="mt-4 text-xs text-primary/45">Last updated {lastUpdated}</p>
      </header>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-headline text-lg font-semibold text-primary">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-primary/75">
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-12 border-t border-primary/10 pt-6 text-sm text-primary/55">
        Questions?{" "}
        <Link href="/settings" className="font-medium text-accent hover:underline">
          Contact support
        </Link>
      </footer>
    </div>
  );
}
