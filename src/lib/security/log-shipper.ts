import "server-only";

import {
  getBetterStackIngestingUrl,
  getBetterStackSourceToken,
} from "@/lib/security/secrets";

const SHIP_TIMEOUT_MS = 3_000;

export type LogEntry = {
  type: string;
  level?: "info" | "warning" | "error";
  [key: string]: unknown;
};

export function isLogShippingConfigured(): boolean {
  return Boolean(getBetterStackSourceToken());
}

/**
 * Always logs locally first (unchanged behavior — Vercel's own log capture
 * still sees every entry). When BETTERSTACK_SOURCE_TOKEN is set, also
 * best-effort forwards the same entry to Better Stack so security events
 * and error logs land somewhere with retention and alerting, not only in
 * whatever log viewer happens to be open. Never throws — a broken or
 * unconfigured log drain must not break the request that triggered it.
 */
export async function shipLog(
  entry: LogEntry,
  options?: { url?: string | null; token?: string | null; fetchImpl?: typeof fetch }
): Promise<void> {
  const level = entry.level ?? "error";
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warning") {
    console.warn(line);
  } else {
    console.log(line);
  }

  const token = options?.token ?? getBetterStackSourceToken();
  if (!token) return;
  const url = options?.url ?? getBetterStackIngestingUrl();
  const fetchImpl = options?.fetchImpl ?? fetch;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SHIP_TIMEOUT_MS);
  try {
    await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dt: new Date().toISOString(), ...entry }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    // Best-effort. The local console line above is the fallback record.
  } finally {
    clearTimeout(timer);
  }
}
