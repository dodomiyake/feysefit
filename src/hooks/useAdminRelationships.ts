import { useEffect, useState } from "react";
import type { AdminRelationship } from "@/lib/admin-relationships";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { listAdminRelationships } from "@/lib/services/relationshipService";
import { useApp } from "@/context/AppContext";

export function useAdminRelationships() {
  const { appDataRevision, customers, designers } = useApp();
  const [relationships, setRelationships] = useState<AdminRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (isSupabaseEnabled()) {
          const rows = await listAdminRelationships();
          if (!cancelled) setRelationships(rows);
          return;
        }

        const demoRows: AdminRelationship[] = [];
        for (const customer of customers) {
          for (const designer of designers.slice(0, 2)) {
            demoRows.push({
              id: `${designer.id}-${customer.id}`,
              designerId: designer.id,
              designerName: designer.businessName,
              customerId: customer.id,
              customerName: customer.name,
              registrationType: "invited",
              isActive: true,
              awaitingDesigner: false,
              createdAt: new Date().toISOString(),
              projectCount: customer.projectCount,
            });
          }
        }
        if (!cancelled) setRelationships(demoRows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load relationships");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [appDataRevision, customers, designers]);

  return { relationships, loading, error };
}
