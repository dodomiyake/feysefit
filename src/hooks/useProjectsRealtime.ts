"use client";

import { useEffect, useId, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useProjectsRealtime(
  enabled: boolean,
  onChange: () => void,
  channelName = "project-updates-live"
) {
  const instanceId = useId();
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const topic = `${channelName}-${instanceId.replace(/:/g, "")}`;
    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "projects" },
        () => {
          onChangeRef.current();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "projects" },
        () => {
          onChangeRef.current();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, channelName, instanceId]);
}
