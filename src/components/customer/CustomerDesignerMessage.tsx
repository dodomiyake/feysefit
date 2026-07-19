import Image from "next/image";
import Link from "next/link";
import type { Designer, Project } from "@/lib/mock-data";
import { projectMessageThreadHref, scheduleFittingMessageHref } from "@/lib/message-links";

interface CustomerDesignerMessageProps {
  designer: Designer;
  project: Project;
}

export function CustomerDesignerMessage({ designer, project }: CustomerDesignerMessageProps) {
  const preview =
    project.customerUpdate?.trim() ||
    "Open messages to continue your conversation with your designer.";

  return (
    <section className="rounded-xl border border-accent/20 bg-brand-dark p-6 text-zinc-100">
      <div className="flex items-start gap-4">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
          {designer.profileImage ? (
            <Image src={designer.profileImage} alt={designer.designerName} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-700 text-sm font-semibold text-white">
              {designer.designerName.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-headline text-lg font-semibold text-white">{designer.businessName}</p>
          <p className="mt-2 text-sm italic leading-relaxed text-zinc-300">&ldquo;{preview}&rdquo;</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={projectMessageThreadHref(project.id)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-brand-dark transition-opacity hover:opacity-90"
            >
              Reply to {designer.businessName.split(" ")[0]}
            </Link>
            <Link
              href={scheduleFittingMessageHref(project.id, designer.designerName.split(" ")[0])}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              Schedule Fitting
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
