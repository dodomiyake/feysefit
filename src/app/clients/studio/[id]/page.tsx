"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { DesignerShell } from "@/components/layout/DesignerShell";
import { TopBar } from "@/components/layout/TopBar";
import { DesktopBackNav } from "@/components/ui/BackButton";
import {
  StudioClientMeasurementsEditor,
  StudioClientProfileFields,
} from "@/components/designer/StudioClientMeasurementsEditor";
import { StudioClientMeasurementPrint } from "@/components/designer/StudioClientMeasurementPrint";
import { StudioClientReferencesCard } from "@/components/designer/StudioClientReferencesCard";
import { useApp } from "@/context/AppContext";
import { getStudioClientById } from "@/lib/services/studioClientService";
import type { StudioClient } from "@/lib/studio-client";
import { formatRecordedBy } from "@/lib/local-customer";
import { FolderKanban, Calendar } from "lucide-react";

export default function StudioClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { authUser, showToast, getDesignerById } = useApp();
  const designerId = authUser?.designerId ?? "";
  const designer = designerId ? getDesignerById(designerId) : undefined;
  const [client, setClient] = useState<StudioClient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!designerId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await getStudioClientById(designerId, id);
        if (!cancelled) setClient(result);
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof Error ? error.message : "Failed to load client", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [designerId, id, showToast]);

  return (
    <DesignerShell mobileTitle="Studio client" showMobileTopBar={false}>
      <TopBar title="Studio Client" showBack backHref="/clients" />
      <div className="mx-auto max-w-4xl px-5 pb-12 pt-6 lg:px-16">
        <DesktopBackNav href="/clients" label="Back to clients" />

        {loading ? (
          <p className="text-primary/60">Loading…</p>
        ) : !client ? (
          <p className="text-primary/60">Studio client not found.</p>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-headline text-2xl font-bold text-primary">{client.name}</h1>
                <p className="mt-1 text-sm text-primary/60">
                  Walk-in client · {formatRecordedBy(client.measurementRecordedBy)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/appointments?studioClient=${encodeURIComponent(client.id)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white"
                >
                  <Calendar className="h-4 w-4" />
                  Schedule appointment
                </Link>
                <Link
                  href={`/clients/studio/${encodeURIComponent(client.id)}/new-project`}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
                >
                  <FolderKanban className="h-4 w-4" />
                  Create project
                </Link>
              </div>
            </div>

            <StudioClientProfileFields
              designerId={designerId}
              client={client}
              onSaved={setClient}
              onError={(message) => showToast(message, "error")}
            />

            <StudioClientReferencesCard
              designerId={designerId}
              client={client}
              onSaved={setClient}
              onError={(message) => showToast(message, "error")}
            />

            <StudioClientMeasurementPrint
              client={client}
              designerName={designer?.designerName}
            />

            <StudioClientMeasurementsEditor
              designerId={designerId}
              client={client}
              onSaved={setClient}
              onError={(message) => showToast(message, "error")}
            />
          </div>
        )}
      </div>
    </DesignerShell>
  );
}
