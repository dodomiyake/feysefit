import { handleApiError, jsonData, jsonError } from "@/server/http";
import { pinterestImageCandidates, upgradePinterestCdnUrl } from "@/lib/reference-image-url";
import { createClient } from "@/lib/supabase/server";
import { clientIpFromHeaders, runSensitiveHttpAction } from "@/lib/security/rate-limit";

type PinterestOEmbed = {
  thumbnail_url?: string;
};

function isAllowedPreviewUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "pin.it") return true;
    return host === "pinterest.com" || host.endsWith(".pinterest.com");
  } catch {
    return false;
  }
}

function extractOgImage(html: string): string | null {
  const patterns = [
    /property="og:image"\s+content="([^"]+)"/i,
    /content="([^"]+)"\s+property="og:image"/i,
    /property='og:image'\s+content='([^']+)'/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function resolveFromPinPage(pinUrl: string): Promise<string | null> {
  const response = await fetch(pinUrl, {
    headers: {
      Accept: "text/html",
      "User-Agent":
        "Mozilla/5.0 (compatible; FeyseFit/1.0; +https://feysefit.com)",
    },
    redirect: "follow",
    next: { revalidate: 3600 },
  });
  if (!response.ok) return null;

  const html = await response.text();
  const ogImage = extractOgImage(html);
  return ogImage ? upgradePinterestCdnUrl(ogImage) : null;
}

async function resolveFromOEmbed(pinUrl: string): Promise<string | null> {
  const oembedUrl = `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(pinUrl)}`;
  const response = await fetch(oembedUrl, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!response.ok) return null;

  const data = (await response.json()) as PinterestOEmbed;
  if (!data.thumbnail_url) return null;
  return upgradePinterestCdnUrl(data.thumbnail_url);
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    if (!url) return jsonError("url is required", 400);
    if (!isAllowedPreviewUrl(url)) {
      return jsonError("Only Pinterest pin links are supported for preview resolution", 400);
    }

    const gated = await runSensitiveHttpAction(
      "referencePreview",
      `${clientIpFromHeaders(request.headers)}:${user.id}`,
      async () => (await resolveFromPinPage(url)) ?? (await resolveFromOEmbed(url))
    );
    if (!gated.ok) return gated.response;
    const imageUrl = gated.value;
    if (!imageUrl) {
      return jsonError("Could not resolve Pinterest pin", 502);
    }

    return jsonData({
      imageUrl,
      sourceUrl: url,
      fallbacks: pinterestImageCandidates(imageUrl).slice(1),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
