export function normalizeReferenceUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Enter an image URL or upload a file");
  if (trimmed.startsWith("data:image/")) return trimmed;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid URL");
    }
    const href = parsed.href;
    return upgradePinterestCdnUrl(href);
  } catch {
    throw new Error("Invalid image URL — paste a link starting with https://");
  }
}

/** Pinterest CDN paths include a size segment like /236x/ — upgrade to sharper variants. */
export function upgradePinterestCdnUrl(url: string): string {
  const candidates = pinterestImageCandidates(url);
  return candidates[0] ?? url;
}

export function pinterestImageCandidates(url: string): string[] {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "i.pinimg.com") return [url];

    const match = parsed.pathname.match(/^\/(\d+x|originals)(\/.*)$/);
    if (!match) return [url];

    const rest = match[2];
    const ordered = [
      `${parsed.origin}/originals${rest}`,
      `${parsed.origin}/736x${rest}`,
      `${parsed.origin}/474x${rest}`,
      url,
    ];
    return [...new Set(ordered)];
  } catch {
    return [url];
  }
}

export function isPinterestPageUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    if (hostname === "i.pinimg.com") return false;
    return (
      hostname === "pin.it" ||
      hostname === "pinterest.com" ||
      hostname.endsWith(".pinterest.com")
    );
  } catch {
    return false;
  }
}

export async function resolveReferenceImageUrl(url: string): Promise<string> {
  const normalized = normalizeReferenceUrl(url);
  if (!isPinterestPageUrl(normalized)) return normalized;

  const response = await fetch(
    `/api/v1/reference-preview?url=${encodeURIComponent(normalized)}`
  );
  if (!response.ok) {
    throw new Error(
      "Could not load that Pinterest pin. Right-click the image on Pinterest, choose Copy image address, or use Upload."
    );
  }

  const payload = (await response.json()) as { data?: { imageUrl?: string }; error?: string };
  if (!payload.data?.imageUrl) {
    throw new Error(payload.error ?? "Pinterest did not return a preview image for that link.");
  }
  return payload.data.imageUrl;
}
