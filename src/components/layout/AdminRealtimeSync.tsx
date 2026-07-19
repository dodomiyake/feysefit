"use client";

import { useCallback, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import {
  usePostgresTablesRealtime,
  type PostgresTableSubscription,
} from "@/hooks/usePostgresTablesRealtime";

const ADMIN_REALTIME_TABLES: readonly PostgresTableSubscription[] = [
  { table: "projects", events: ["INSERT", "UPDATE"] },
  { table: "unlink_requests", events: ["INSERT", "UPDATE"] },
  { table: "marketplace_listings", events: ["INSERT", "UPDATE"] },
  { table: "reports", events: ["INSERT", "UPDATE"] },
  { table: "designer_profiles", events: ["INSERT"] },
  { table: "customer_profiles", events: ["INSERT", "UPDATE"] },
  { table: "designer_customer_relationships", events: ["INSERT", "UPDATE"] },
  { table: "invite_codes", events: ["INSERT", "UPDATE"] },
  { table: "project_delivery_issues", events: ["INSERT", "UPDATE"] },
  { table: "testimonials", events: ["INSERT", "UPDATE"] },
  { table: "testimonial_reports", events: ["INSERT", "UPDATE"] },
];

/** Keeps admin dashboards, sidebar badges, and notifications in sync with Supabase. */
export function AdminRealtimeSync() {
  const { hydrated, role, refreshAppData } = useApp();
  const useSupabase = isSupabaseEnabled();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void refreshAppData();
      debounceRef.current = null;
    }, 400);
  }, [refreshAppData]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  usePostgresTablesRealtime(
    useSupabase && hydrated && role === "admin",
    ADMIN_REALTIME_TABLES,
    handleChange,
    "admin-dashboard-live"
  );

  return null;
}
