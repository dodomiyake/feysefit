"use client";

import { use, useEffect, useState } from "react";
import { DesignerShell } from "@/components/layout/DesignerShell";
import { TopBar } from "@/components/layout/TopBar";
import { CreateStudioProjectForm } from "@/components/projects/CreateStudioProjectForm";
import { getStudioClientById } from "@/lib/services/studioClientService";
import type { StudioClient } from "@/lib/studio-client";
import { useApp } from "@/context/AppContext";

export default function StudioClientNewProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { authUser, showToast } = useApp();
  const designerId = authUser?.designerId ?? "";
  const [client, setClient] = useState<StudioClient | null>(null);

  useEffect(() => {
    if (!designerId) return;
    void getStudioClientById(designerId, id).then(setClient).catch(() => {
      showToast("Could not load studio client", "error");
    });
  }, [designerId, id, showToast]);

  if (!client) {
    return (
      <DesignerShell mobileTitle="New project" showMobileTopBar={false}>
        <TopBar title="New Project" showBack backHref={`/clients/studio/${id}`} />
        <p className="p-8 text-primary/60">Loading…</p>
      </DesignerShell>
    );
  }

  return (
    <DesignerShell mobileTitle="New project" showMobileTopBar={false}>
      <TopBar title="Walk-in Project" showBack backHref={`/clients/studio/${id}`} />
      <CreateStudioProjectForm client={client} />
    </DesignerShell>
  );
}
