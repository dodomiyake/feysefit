"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveStorageAccessUrl } from "@/lib/services/storageService";
import { isPrivateStorageUrl } from "@/lib/storage/storage-url";

/** Resolve private Supabase storage URLs to fresh signed URLs for display. */
export function useResolvedStorageUrl(url: string | null | undefined): string {
  const next = url?.trim() ?? "";
  const needsResolve = Boolean(next && isPrivateStorageUrl(next));
  const [resolved, setResolved] = useState("");
  const [resolvedFor, setResolvedFor] = useState("");

  useEffect(() => {
    if (!needsResolve) return;

    let cancelled = false;
    void resolveStorageAccessUrl(next).then((value) => {
      if (cancelled) return;
      setResolved(value);
      setResolvedFor(next);
    });
    return () => {
      cancelled = true;
    };
  }, [next, needsResolve]);

  if (!needsResolve) return next;
  return resolvedFor === next ? resolved : "";
}

export function useResolvedStorageUrls(urls: string[]): string[] {
  const key = useMemo(() => urls.join("\0"), [urls]);
  const list = useMemo(() => (key ? key.split("\0") : []), [key]);
  const needsAsync = list.some((url) => {
    const trimmed = url.trim();
    return Boolean(trimmed && isPrivateStorageUrl(trimmed));
  });
  const syncResolved = useMemo(
    () => list.map((url) => url.trim()),
    [list]
  );
  const [resolved, setResolved] = useState<string[]>([]);
  const [resolvedFor, setResolvedFor] = useState("");

  useEffect(() => {
    if (list.length === 0 || !needsAsync) return;

    let cancelled = false;
    void (async () => {
      const next = await Promise.all(
        list.map(async (url) => {
          const trimmed = url.trim();
          if (!trimmed || !isPrivateStorageUrl(trimmed)) return trimmed;
          return resolveStorageAccessUrl(trimmed);
        })
      );
      if (cancelled) return;
      setResolved(next);
      setResolvedFor(key);
    })();
    return () => {
      cancelled = true;
    };
  }, [key, list, needsAsync]);

  if (list.length === 0) return [];
  if (!needsAsync) return syncResolved;
  return resolvedFor === key ? resolved : syncResolved.map(() => "");
}
