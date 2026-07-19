interface ProjectInternalNotesCardProps {
  notes: string;
}

export function ProjectInternalNotesCard({ notes }: ProjectInternalNotesCardProps) {
  if (!notes.trim()) return null;

  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 border-l-4 border-l-accent bg-surface-container p-6 shadow-warm">
      <h3 className="font-headline text-lg font-semibold text-primary">Internal Notes</h3>
      <p className="mt-3 text-sm leading-relaxed text-primary/75 italic">{notes}</p>
    </section>
  );
}
