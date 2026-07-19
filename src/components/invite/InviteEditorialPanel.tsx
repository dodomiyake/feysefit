import Image from "next/image";
import { INVITE_EDITORIAL_IMAGE, INVITE_EDITORIAL_QUOTE } from "@/lib/invite-types";

export function InviteEditorialPanel() {
  return (
    <div className="group relative h-48 overflow-hidden rounded-xl">
      <Image
        src={INVITE_EDITORIAL_IMAGE}
        alt="Luxury fabric draped on a tailor's mannequin in a warm atelier"
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        sizes="(max-width: 1024px) 100vw, 400px"
      />
      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-4">
        <p className="text-sm font-medium italic text-white">{INVITE_EDITORIAL_QUOTE}</p>
      </div>
    </div>
  );
}
