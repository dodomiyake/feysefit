import { jsonData, jsonError } from "@/server/http";
import { pinterestImageCandidates, upgradePinterestCdnUrl } from "@/lib/reference-image-url";
import { createClient } from "@/lib/supabase/server";
import { clientIpFromHeaders, runSensitiveHttpAction } from "@/lib/security/rate-limit";
import {
  decodeFetchBody,
  fetchPinterestHttps,
  isAllowedPinterestUrl,
} from "@/lib/security/safe-outbound-fetch";

type PinterestOEmbed = {
  thumbnail_url?: string;
};

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

function publicPreviewFailure() {
  return jsonError("Could not resolve Pinterest pin", 502);
}

async function resolveFromPinPage(pinUrl: string): Promise<string | null> {
  const result = await fetchPinterestHttps(pinUrl);
  if (!result.ok) return null;
  const html = decodeFetchBody(result.body);
  const ogImage = extractOgImage(html);
  if (!ogImage) return null;
  const upgraded = upgradePinterestCdnUrl(ogImage);
  return isAllowedPinterestUrl(upgraded).ok ? upgraded : null;
}

async function resolveFromOEmbed(pinUrl: string): Promise<string | null> {
  const oembedUrl = `https://www.pinterest.com/oembed.json?url=${encodeURIComponent(pinUrl)}`;
  const result = await fetchPinterestHttps(oembedUrl);
  if (!result.ok) return null;
  try {
    const data = JSON.parse(decodeFetchBody(result.body)) as PinterestOEmbed;
    if (!data.thumbnail_url) return null;
    const upgraded = upgradePinterestCdnUrl(data.thumbnail_url);
    return isAllowedPinterestUrl(upgraded).ok ? upgraded : null;
  } catch {
    return null;
  }
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
    if (!isAllowedPinterestUrl(url).ok) {
      return jsonError("Only Pinterest pin links are supported for preview resolution", 400);
    }

    const gated = await runSensitiveHttpAction(
      "referencePreview",
      `${clientIpFromHeaders(request.headers)}:${user.id}`,
      async () => (await resolveFromPinPage(url)) ?? (await resolveFromOEmbed(url))
    );
    if (!gated.ok) return gated.response;
    const imageUrl = gated.value;
    if (!imageUrl) return publicPreviewFailure();

    return jsonData({
      imageUrl,
      sourceUrl: url,
      fallbacks: pinterestImageCandidates(imageUrl).slice(1),
    });
  } catch {
    return publicPreviewFailure();
  }
}
