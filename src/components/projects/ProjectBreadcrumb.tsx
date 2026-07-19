import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface ProjectBreadcrumbProps {
  current: string;
}

export function ProjectBreadcrumb({ current }: ProjectBreadcrumbProps) {
  return (
    <nav className="mb-4 flex items-center gap-2 text-sm text-ink-muted" aria-label="Breadcrumb">
      <Link href="/projects" className="transition-colors hover:text-primary">
        Projects
      </Link>
      <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
      <span className="font-medium text-primary">{current}</span>
    </nav>
  );
}
