"use client";

import { useEffect, useId, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { mapThreadMessage } from "@/lib/supabase/mappers";
import type { ThreadMessage } from "@/lib/conversations";
import type { DbMessage } from "@/lib/types/database";

export function useProjectMessagesRealtime(
  enabled: boolean,
  onMessage: (projectUuid: string, message: ThreadMessage) => void,
  channelName = "project-messages-live"
) {
  const instanceId = useId();
  const onMessageRef = useRef(onMessage);

  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const topic = `${channelName}-${instanceId.replace(/:/g, "")}`;
    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as DbMessage;
          if (!row?.project_id) return;
          onMessageRef.current(row.project_id, mapThreadMessage(row));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, channelName, instanceId]);
}
