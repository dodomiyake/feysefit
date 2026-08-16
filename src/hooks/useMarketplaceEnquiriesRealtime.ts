"use client";

import { useEffect, useId, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useMarketplaceEnquiriesRealtime(
  enabled: boolean,
  onChange: () => void,
  channelName = "marketplace-enquiries-live"
) {
  const instanceId = useId();
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const topic = `${channelName}-${instanceId.replace(/:/g, "")}`;
    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketplace_enquiries" },
        () => onChangeRef.current()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "marketplace_enquiry_messages" },
        () => onChangeRef.current()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, channelName, instanceId]);
}
