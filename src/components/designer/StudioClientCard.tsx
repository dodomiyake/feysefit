import Link from "next/link";
import type { StudioClient } from "@/lib/studio-client";
import { countStudioClientMeasurements, studioClientHasMeasurements } from "@/lib/studio-client";
import { formatRecordedBy } from "@/lib/local-customer";
import { getCustomerInitials } from "@/lib/customer-display";
import { MapPin, Mail, Phone, Ruler } from "lucide-react";

export function StudioClientCard({ client }: { client: StudioClient }) {
  const measurementCount = countStudioClientMeasurements(client);

  return (
    <div className="rounded-xl bg-surface-container p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-card font-headline text-sm font-semibold text-primary">
          {getCustomerInitials(client.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-headline text-lg font-semibold text-primary">{client.name}</h3>
          <p className="mt-0.5 text-sm text-primary/55">Studio client · walk-in</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {measurementCount > 0 ? `${measurementCount} measures` : "No measures"}
        </span>
      </div>

      <div className="mt-4 space-y-1.5 text-sm text-primary/60">
        {client.location && (
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/40" />
            {client.location}
          </p>
        )}
        {client.phone && (
          <p className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-primary/40" />
            {client.phone}
          </p>
        )}
        {client.email && (
          <p className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 shrink-0 text-primary/40" />
            {client.email}
          </p>
        )}
        {studioClientHasMeasurements(client) && (
          <p className="text-xs text-primary/50">{formatRecordedBy(client.measurementRecordedBy)}</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/clients/studio/${encodeURIComponent(client.id)}`}
          className="flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-full border border-primary/10 bg-card py-2.5 text-sm font-medium text-primary transition-colors hover:border-zinc-800 hover:bg-zinc-900 hover:text-white"
        >
          <Ruler className="h-4 w-4" />
          Profile & Measures
        </Link>
      </div>
    </div>
  );
}
