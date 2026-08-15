const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 8_000;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "metadata.google.com",
  "169.254.169.254",
]);

function isIpv4(hostname: string): number[] | null {
  const parts = hostname.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return nums;
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host.endsWith(".localhost")) return true;

  const ipv4 = isIpv4(host);
  if (ipv4) {
    const [a, b] = ipv4;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }

  if (host.includes(":")) {
    if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) {
      return true;
    }
  }
  return false;
}

export function isAllowedPinterestUrl(url: string): { ok: true; parsed: URL } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (parsed.protocol !== "https:") return { ok: false, reason: "protocol" };
  if (parsed.username || parsed.password) return { ok: false, reason: "credentials" };
  const host = parsed.hostname.toLowerCase();
  if (isPrivateOrLocalHostname(host)) return { ok: false, reason: "private_host" };
  const allowed =
    host === "pin.it" ||
    host === "pinterest.com" ||
    host.endsWith(".pinterest.com") ||
    host === "i.pinimg.com" ||
    host.endsWith(".pinimg.com");
  if (!allowed) return { ok: false, reason: "host" };
  return { ok: true, parsed };
}

export type SafeFetchFailure = {
  ok: false;
  reason: string;
};

export type SafeFetchSuccess = {
  ok: true;
  url: string;
  contentType: string;
  body: Uint8Array;
};

export async function fetchPinterestHttps(url: string): Promise<SafeFetchSuccess | SafeFetchFailure> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const allowed = isAllowedPinterestUrl(current);
    if (!allowed.ok) return { ok: false, reason: allowed.reason };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(allowed.parsed.toString(), {
        method: "GET",
        redirect: "manual",
        headers: {
          Accept: "text/html,application/json;q=0.9,*/*;q=0.1",
          "User-Agent": "FeyseFitPreview/1.0",
        },
        cache: "no-store",
        signal: controller.signal,
      });
    } catch {
      return { ok: false, reason: "network" };
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { ok: false, reason: "redirect" };
      try {
        current = new URL(location, allowed.parsed).toString();
      } catch {
        return { ok: false, reason: "redirect" };
      }
      continue;
    }

    if (!response.ok) return { ok: false, reason: "status" };

    const contentType = (response.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    if (
      contentType &&
      !contentType.startsWith("text/html") &&
      contentType !== "application/json" &&
      !contentType.startsWith("application/json")
    ) {
      return { ok: false, reason: "content_type" };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const buffer = new Uint8Array(await response.arrayBuffer());
      if (buffer.byteLength > MAX_RESPONSE_BYTES) return { ok: false, reason: "too_large" };
      return { ok: true, url: allowed.parsed.toString(), contentType, body: buffer };
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, url: allowed.parsed.toString(), contentType, body };
  }
  return { ok: false, reason: "redirect_limit" };
}

export function decodeFetchBody(body: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(body);
}
