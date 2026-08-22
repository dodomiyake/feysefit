import "server-only";

import {
  bytesToBase64Url,
  base64UrlToBytes,
  hmacSha256,
  timingSafeEqual,
} from "@/lib/security/hmac";
import {
  getSecurityCookieSecret,
  getSecurityCookieSecretsForVerify,
} from "@/lib/security/secrets";

export const SIGNED_STATE_VERSION = 1 as const;

export type SignedPurpose = "reauth" | "session_started" | "last_activity";

export type SignedClaims = {
  v: typeof SIGNED_STATE_VERSION;
  kid: string;
  pur: SignedPurpose;
  sub: string;
  sid: string;
  iat: number;
  exp: number;
};

export type SignedStateVerifyFailure =
  | "missing_secret"
  | "malformed"
  | "modified"
  | "expired"
  | "wrong_user"
  | "wrong_session"
  | "wrong_purpose"
  | "missing_claims";

export type SignedStateVerifyResult =
  | { ok: true; claims: SignedClaims }
  | { ok: false; reason: SignedStateVerifyFailure };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CURRENT_KID = "c";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseClaims(payload: unknown): SignedClaims | null {
  if (!isRecord(payload)) return null;
  const { v, kid, pur, sub, sid, iat, exp } = payload;
  if (v !== SIGNED_STATE_VERSION) return null;
  const keyId = typeof kid === "string" && kid.length >= 1 && kid.length <= 16 ? kid : CURRENT_KID;
  if (pur !== "reauth" && pur !== "session_started" && pur !== "last_activity") return null;
  if (typeof sub !== "string" || !UUID_RE.test(sub)) return null;
  if (typeof sid !== "string" || sid.length < 8 || sid.length > 128) return null;
  if (typeof iat !== "number" || !Number.isFinite(iat) || iat <= 0) return null;
  if (typeof exp !== "number" || !Number.isFinite(exp) || exp <= iat) return null;
  return { v: SIGNED_STATE_VERSION, kid: keyId, pur, sub, sid, iat, exp };
}

export async function issueSignedState(input: {
  purpose: SignedPurpose;
  userId: string;
  sessionId: string;
  issuedAtMs: number;
  expiresAtMs: number;
  secret?: string | null;
}): Promise<string | null> {
  const secret = input.secret ?? getSecurityCookieSecret();
  if (!secret) return null;
  const claims: SignedClaims = {
    v: SIGNED_STATE_VERSION,
    kid: CURRENT_KID,
    pur: input.purpose,
    sub: input.userId,
    sid: input.sessionId,
    iat: input.issuedAtMs,
    exp: input.expiresAtMs,
  };
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(claims)));
  const mac = bytesToBase64Url(await hmacSha256(secret, body));
  return `${body}.${mac}`;
}

async function macMatches(secret: string, body: string, macBytes: Uint8Array): Promise<boolean> {
  const expectedMac = await hmacSha256(secret, body);
  return timingSafeEqual(macBytes, expectedMac);
}

export async function verifySignedState(input: {
  token: string | undefined;
  purpose: SignedPurpose;
  userId: string;
  sessionId: string;
  nowMs?: number;
  secret?: string | null;
  previousSecret?: string | null;
}): Promise<SignedStateVerifyResult> {
  const secrets =
    input.secret || input.previousSecret
      ? [input.secret, input.previousSecret].filter((value): value is string => Boolean(value))
      : getSecurityCookieSecretsForVerify();
  if (secrets.length === 0) return { ok: false, reason: "missing_secret" };

  const raw = input.token?.trim() ?? "";
  const parts = raw.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: "malformed" };
  }
  const payloadBytes = base64UrlToBytes(parts[0]);
  const macBytes = base64UrlToBytes(parts[1]);
  if (!payloadBytes || !macBytes) return { ok: false, reason: "malformed" };

  let matched = false;
  for (const secret of secrets) {
    if (await macMatches(secret, parts[0], macBytes)) {
      matched = true;
      break;
    }
  }
  if (!matched) return { ok: false, reason: "modified" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const claims = parseClaims(parsed);
  if (!claims) return { ok: false, reason: "missing_claims" };
  if (claims.pur !== input.purpose) return { ok: false, reason: "wrong_purpose" };
  if (claims.sub !== input.userId) return { ok: false, reason: "wrong_user" };
  if (claims.sid !== input.sessionId) return { ok: false, reason: "wrong_session" };
  if ((input.nowMs ?? Date.now()) > claims.exp) return { ok: false, reason: "expired" };
  return { ok: true, claims };
}
