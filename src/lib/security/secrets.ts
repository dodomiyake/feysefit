import "server-only";

function readSecret(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Server-only. Never expose via NEXT_PUBLIC_*. */
export function getSecurityCookieSecret(): string | null {
  return readSecret("SECURITY_COOKIE_SECRET");
}

/** Previous cookie secret for rotation. Verify-only; new tokens use the current secret. */
export function getSecurityCookieSecretPrevious(): string | null {
  return readSecret("SECURITY_COOKIE_SECRET_PREVIOUS");
}

export function getSecurityCookieSecretsForVerify(): string[] {
  const secrets = [getSecurityCookieSecret(), getSecurityCookieSecretPrevious()].filter(
    (value): value is string => Boolean(value)
  );
  return [...new Set(secrets)];
}

/** Server-only HMAC for rate-limit bucket identifiers. */
export function getRateLimitHmacSecret(): string | null {
  return readSecret("RATE_LIMIT_HMAC_SECRET");
}

export function getRateLimitHmacSecretPrevious(): string | null {
  return readSecret("RATE_LIMIT_HMAC_SECRET_PREVIOUS");
}

/** Server-only HMAC for security-event email identifiers. */
export function getSecurityEventHmacSecret(): string | null {
  return readSecret("SECURITY_EVENT_HMAC_SECRET");
}

export function getSecurityEventHmacSecretPrevious(): string | null {
  return readSecret("SECURITY_EVENT_HMAC_SECRET_PREVIOUS");
}

export function getServiceRoleKey(): string | null {
  return readSecret("SUPABASE_SERVICE_ROLE_KEY");
}

/** URL of the ClamAV scan proxy (services/clamav-proxy). Unset disables scanning. */
export function getClamavScanUrl(): string | null {
  return readSecret("CLAMAV_SCAN_URL");
}

/** Server-only bearer token for the ClamAV scan proxy. Never NEXT_PUBLIC_*. */
export function getClamavScanToken(): string | null {
  return readSecret("CLAMAV_SCAN_TOKEN");
}

/** Server-only Better Stack (Logtail) source token. Never NEXT_PUBLIC_*. */
export function getBetterStackSourceToken(): string | null {
  return readSecret("BETTERSTACK_SOURCE_TOKEN");
}

/** Optional override for Better Stack's ingesting host. Defaults to the shared endpoint. */
export function getBetterStackIngestingUrl(): string {
  return readSecret("BETTERSTACK_INGESTING_URL") ?? "https://in.logs.betterstack.com";
}

export function missingServerSecret(name: string): Error {
  return new Error(`${name} is not configured`);
}
