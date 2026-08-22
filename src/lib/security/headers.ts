const TURNSTILE_HOST = "https://challenges.cloudflare.com";

export function generateCspNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function buildContentSecurityPolicy(nonce: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  let supabaseOrigin = "https://*.supabase.co";
  let supabaseWs = "wss://*.supabase.co";
  if (supabaseUrl) {
    try {
      const { origin, hostname } = new URL(supabaseUrl);
      supabaseOrigin = origin;
      supabaseWs = `wss://${hostname}`;
    } catch {
      // keep wildcard supabase hosts
    }
  }

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${TURNSTILE_HOST}`,
    // Next.js and Tailwind emit inline styles; scripts are nonce-gated and do not use unsafe-eval.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabaseOrigin} https://images.unsplash.com https://lh3.googleusercontent.com https://i.pinimg.com`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `frame-src ${TURNSTILE_HOST}`,
    `connect-src 'self' ${supabaseOrigin} ${supabaseWs} ${TURNSTILE_HOST} https://www.pinterest.com`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}

export function securityHeaders(nonce: string): Array<{ key: string; value: string }> {
  const headers: Array<{ key: string; value: string }> = [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(nonce) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];

  if (process.env.NODE_ENV === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}

export function applySecurityHeaders(response: Response, nonce: string): Response {
  for (const header of securityHeaders(nonce)) {
    response.headers.set(header.key, header.value);
  }
  return response;
}
