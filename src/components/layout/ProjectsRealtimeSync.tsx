"use client";

import { useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { useProjectsRealtime } from "@/hooks/useProjectsRealtime";

/** Keeps project timelines in sync when either party updates a project in Supabase. */
export function ProjectsRealtimeSync() {
  const { hydrated, role, refreshAppData } = useApp();
  const useSupabase = isSupabaseEnabled();

  const handleProjectChange = useCallback(() => {
    void refreshAppData();
  }, [refreshAppData]);

  useProjectsRealtime(
    useSupabase && hydrated && (role === "designer" || role === "customer"),
    handleProjectChange,
    "projects-live-sync"
  );

  return null;
}
