/**
 * Trusted-proxy / IP-header boundary.
 *
 * Browser clients can set `x-forwarded-for` and `cf-connecting-ip`. Headers are
 * therefore not a trusted network signal unless a *server-only* deployment
 * setting confirms the process sits behind a proxy that overwrites them.
 *
 * Trust matrix:
 *   - TRUST_CLOUDFLARE=1: use `cf-connecting-ip` (Cloudflare overwrites this).
 *     Do not trust that header merely because it is present.
 *   - VERCEL=1: use `x-vercel-forwarded-for` or `x-real-ip` (platform-set).
 *   - TRUSTED_PROXY=1: use the *last* `x-forwarded-for` hop.
 *
 * If none of those settings are set, forwarding headers are ignored.
 */
function sanitizeIp(value: string | undefined | null): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed.length > 64) return null;
  if (/[\s]/.test(trimmed)) return null;
  return trimmed;
}

export function clientIpFromHeaders(headers: Headers): string {
  const vercel = process.env.VERCEL === "1";
  const trustCloudflare = process.env.TRUST_CLOUDFLARE === "1";
  const trustedProxy = process.env.TRUSTED_PROXY === "1";

  if (trustCloudflare) {
    const cf = sanitizeIp(headers.get("cf-connecting-ip"));
    if (cf) return cf;
  }

  if (vercel) {
    const vercelForwarded = sanitizeIp(headers.get("x-vercel-forwarded-for")?.split(",")[0]);
    if (vercelForwarded) return vercelForwarded;
    const realIp = sanitizeIp(headers.get("x-real-ip"));
    if (realIp) return realIp;
  }

  if (trustedProxy) {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
      const hops = forwarded
        .split(",")
        .map((hop) => sanitizeIp(hop))
        .filter((hop): hop is string => Boolean(hop));
      if (hops.length > 0) return hops[hops.length - 1]!;
    }
    const realIp = sanitizeIp(headers.get("x-real-ip"));
    if (realIp) return realIp;
  }

  return "unknown";
}
