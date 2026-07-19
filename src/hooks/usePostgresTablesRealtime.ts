"use client";

import { useEffect, useId, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type RealtimeChangeEvent = "INSERT" | "UPDATE" | "DELETE";

export interface PostgresTableSubscription {
  table: string;
  events?: RealtimeChangeEvent[];
}

export function usePostgresTablesRealtime(
  enabled: boolean,
  tables: readonly PostgresTableSubscription[],
  onChange: () => void,
  channelName = "postgres-tables-live"
) {
  const instanceId = useId();
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled || !tables.length) return;

    const supabase = createClient();
    const topic = `${channelName}-${instanceId.replace(/:/g, "")}`;
    let channel = supabase.channel(topic);

    for (const subscription of tables) {
      for (const event of subscription.events ?? ["INSERT", "UPDATE"]) {
        channel = channel.on(
          "postgres_changes",
          { event, schema: "public", table: subscription.table },
          () => {
            onChangeRef.current();
          }
        );
      }
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, channelName, instanceId, tables]);
}
