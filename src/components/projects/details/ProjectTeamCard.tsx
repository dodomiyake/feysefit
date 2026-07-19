import Image from "next/image";
import type { ResolvedProjectDetails } from "@/lib/project-details";

interface ProjectTeamCardProps {
  details: ResolvedProjectDetails;
}

export function ProjectTeamCard({ details }: ProjectTeamCardProps) {
  const { teamMembers } = details;
  if (teamMembers.length === 0) return null;

  const visible = teamMembers.slice(0, 4);
  const overflow = teamMembers.length - visible.length;

  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-5 shadow-warm">
      <h3 className="font-headline text-lg font-semibold text-primary">Internal Team</h3>
      <p className="mt-1 text-xs text-ink-muted">Assigned artisans on this project</p>

      <div className="mt-4 flex items-center">
        <div className="flex -space-x-2">
          {visible.map((member) => (
            <div
              key={member.name}
              className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-surface-container"
              title={member.name}
            >
              <Image
                src={member.avatar}
                alt={member.name}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          ))}
          {overflow > 0 && (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface-container bg-primary text-xs font-semibold text-background">
              +{overflow}
            </div>
          )}
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {teamMembers.map((member) => (
          <li key={member.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium text-primary">{member.name}</span>
            <span className="text-xs text-ink-muted">{member.role}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
