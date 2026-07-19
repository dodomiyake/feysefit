import { BadgeCheck } from "lucide-react";

export function DesignerNoteCard() {
  return (
    <section className="rounded-xl bg-brand-dark p-6 text-white lg:p-8">
      <h3 className="mb-4 text-lg font-semibold italic">Designer&apos;s Note</h3>
      <p className="text-sm italic leading-relaxed opacity-80">
        &ldquo;Every commission is a conversation between fabric and soul. By filling this form,
        you initiate the creation of something truly singular.&rdquo;
      </p>
      <div className="mt-8 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10">
          <BadgeCheck className="h-6 w-6 text-white" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-medium">Verified Artisan</p>
          <p className="text-xs opacity-60">FeyseFit Quality Standard</p>
        </div>
      </div>
    </section>
  );
}
