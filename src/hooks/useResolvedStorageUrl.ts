"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveStorageAccessUrl } from "@/lib/services/storageService";
import { isPrivateStorageUrl } from "@/lib/storage/storage-url";

/** Resolve private Supabase storage URLs to fresh signed URLs for display. */
export function useResolvedStorageUrl(url: string | null | undefined): string {
  const [resolved, setResolved] = useState("");

  useEffect(() => {
    const next = url?.trim() ?? "";
    if (!next) {
      setResolved("");
      return;
    }
    if (!isPrivateStorageUrl(next)) {
      setResolved(next);
      return;
    }

    setResolved("");
    let cancelled = false;
    void resolveStorageAccessUrl(next).then((value) => {
      if (!cancelled) setResolved(value);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return resolved;
}

export function useResolvedStorageUrls(urls: string[]): string[] {
  const key = useMemo(() => urls.join("\0"), [urls]);
  const [resolved, setResolved] = useState<string[]>([]);

  useEffect(() => {
    const list = key ? key.split("\0") : [];
    if (list.length === 0) {
      setResolved([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      const next = await Promise.all(
        list.map(async (url) => {
          const trimmed = url.trim();
          if (!trimmed || !isPrivateStorageUrl(trimmed)) return trimmed;
          return resolveStorageAccessUrl(trimmed);
        })
      );
      if (!cancelled) setResolved(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return resolved;
}
