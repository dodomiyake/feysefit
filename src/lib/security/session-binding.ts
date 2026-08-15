const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;
  const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/") + "===".slice((parts[1].length + 3) % 4);
  try {
    const json = atob(padded);
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Supabase access tokens include session_id. Reject tokens without it. */
export function sessionIdFromAccessToken(accessToken: string | undefined | null): string | null {
  if (!accessToken) return null;
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return null;
  const sessionId = payload.session_id;
  if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) return null;
  return sessionId;
}

export function jwtSubjectFromAccessToken(accessToken: string | undefined | null): string | null {
  if (!accessToken) return null;
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return null;
  const sub = payload.sub;
  if (typeof sub !== "string" || !UUID_RE.test(sub)) return null;
  return sub;
}

export function jwtIssuedAtMs(accessToken: string | undefined | null): number | null {
  if (!accessToken) return null;
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return null;
  const iat = payload.iat;
  if (typeof iat !== "number" || !Number.isFinite(iat) || iat <= 0) return null;
  return Math.floor(iat * 1000);
}

export type SessionBinding = {
  userId: string;
  sessionId: string;
  jwtIssuedAtMs: number | null;
};

/**
 * Bind signed cookies to claims from a token that `auth.getUser()` already
 * validated. `sub` must match that user id; `session_id` must be a UUID.
 */
export function sessionBindingFromAccessToken(input: {
  userId: string;
  accessToken: string | undefined | null;
}): SessionBinding | null {
  const sessionId = sessionIdFromAccessToken(input.accessToken);
  const tokenSub = jwtSubjectFromAccessToken(input.accessToken);
  if (!sessionId || !tokenSub) return null;
  if (!UUID_RE.test(input.userId) || tokenSub !== input.userId) return null;
  return {
    userId: input.userId,
    sessionId,
    jwtIssuedAtMs: jwtIssuedAtMs(input.accessToken),
  };
}
