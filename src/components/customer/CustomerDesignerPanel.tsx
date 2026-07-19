import Image from "next/image";
import Link from "next/link";
import { MessageSquare, Calendar } from "lucide-react";
import type { Designer } from "@/lib/mock-data";
import { formatDesignerExperience } from "@/lib/designer-display";
import { designerMessageThreadHref } from "@/lib/message-links";
import { LINKED_DESIGNER_PAGE_HREF } from "@/lib/customer-designer-links";

export function CustomerDesignerPanel({ designer }: { designer: Designer }) {
  return (
    <section className="flex flex-col items-center rounded-xl border border-primary/10 bg-card p-6 text-center shadow-sm">
      <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-full ring-4 ring-accent/30">
        <Image src={designer.profileImage} alt={designer.designerName} fill className="object-cover" />
      </div>
      <h3 className="font-headline text-xl font-semibold text-primary">{designer.businessName}</h3>
      <p className="mb-6 text-sm text-primary/55">{designer.specialty}</p>
      <div className="mb-6 w-full space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-primary/55">Experience</span>
          <span className="font-semibold text-primary">
            {formatDesignerExperience(designer.yearsExperience)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-primary/55">Style</span>
          <span className="font-semibold text-primary">{designer.specialty.split("&")[0].trim()}</span>
        </div>
      </div>
      <Link
        href={LINKED_DESIGNER_PAGE_HREF}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-full border border-primary/15 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
      >
        <Calendar className="h-4 w-4" />
        Book appointment
      </Link>
      <Link
        href={designerMessageThreadHref(designer.id)}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
      >
        <MessageSquare className="h-4 w-4" />
        Message {designer.businessName.split(" ")[0]}
      </Link>
    </section>
  );
}
