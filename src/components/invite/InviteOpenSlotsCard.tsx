import { INVITE_OPEN_SLOTS } from "@/lib/invite-types";
import { Sparkles } from "lucide-react";

export function InviteOpenSlotsCard() {
  return (
    <div className="relative flex items-center justify-between overflow-hidden rounded-xl bg-primary p-6 text-background">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">
          Open Slots
        </p>
        <p className="mt-1 font-headline text-4xl font-bold">
          {String(INVITE_OPEN_SLOTS).padStart(2, "0")}
        </p>
      </div>
      <Sparkles className="h-16 w-16 shrink-0 opacity-20" strokeWidth={1} aria-hidden />
    </div>
  );
}
