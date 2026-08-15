import "server-only";

import { hmacSha256Hex } from "@/lib/security/hmac";
import { redactForLogs } from "@/lib/security/redact";
import { getRateLimitHmacSecret } from "@/lib/security/secrets";

export const RATE_LIMITED_CODE = "rate_limited";
export const RATE_LIMIT_UNAVAILABLE_CODE = "rate_limit_unavailable";
export const RATE_LIMITED_MESSAGE = "Too many requests. Try again shortly.";
export const RATE_LIMIT_UNAVAILABLE_MESSAGE =
  "This action is temporarily unavailable. Please try again.";

export const SENSITIVE_RATE_LIMITS = {
  authAbuse: { limit: 20, windowSeconds: 60 },
  adminMutation: { limit: 30, windowSeconds: 60 },
  securityEvent: { limit: 30, windowSeconds: 60 },
  accountActivity: { limit: 40, windowSeconds: 60 },
  designRequest: { limit: 20, windowSeconds: 60 },
  messagingWrite: { limit: 40, windowSeconds: 60 },
  inviteEmail: { limit: 10, windowSeconds: 60 },
  inviteLookup: { limit: 20, windowSeconds: 60 },
  inviteLookupGlobal: { limit: 120, windowSeconds: 60 },
  referencePreview: { limit: 30, windowSeconds: 60 },
} as const;

export type SensitiveRateLimitKind = keyof typeof SENSITIVE_RATE_LIMITS;

export const RATE_LIMIT_OPERATIONS: Record<SensitiveRateLimitKind, string> = {
  authAbuse: "auth_abuse",
  adminMutation: "admin_mutation",
  securityEvent: "security_event",
  accountActivity: "account_activity",
  designRequest: "design_request",
  messagingWrite: "messaging_write",
  inviteEmail: "invite_email",
  inviteLookup: "invite_lookup",
  inviteLookupGlobal: "invite_lookup_global",
  referencePreview: "reference_preview",
};

export type ConsumeRateLimitRpc = (args: {
  p_bucket: string;
  p_limit: number;
  p_window_seconds: number;
}) => Promise<{ data: unknown; error: { message?: string } | null }>;

export type DurableRateLimitDecision =
  | { ok: true }
  | { ok: false; kind: "limited" }
  | { ok: false; kind: "unavailable"; requestId: string };

export type DeniedDurableRateLimitDecision = Extract<
  DurableRateLimitDecision,
  { ok: false }
>;

export class SensitiveRateLimitError extends Error {
  readonly status: 429 | 503;
  readonly code: string;
  readonly requestId?: string;
  readonly decision: DeniedDurableRateLimitDecision;

  constructor(decision: DeniedDurableRateLimitDecision) {
    const unavailable = decision.kind === "unavailable";
    super(unavailable ? RATE_LIMIT_UNAVAILABLE_MESSAGE : RATE_LIMITED_MESSAGE);
    this.name = "SensitiveRateLimitError";
    this.decision = decision;
    this.status = unavailable ? 503 : 429;
    this.code = unavailable ? RATE_LIMIT_UNAVAILABLE_CODE : RATE_LIMITED_CODE;
    this.requestId = unavailable ? decision.requestId : undefined;
  }
}

export function logRateLimitInfrastructureFailure(
  requestId: string,
  cause: unknown
): void {
  const raw =
    cause instanceof Error
      ? cause.message
      : typeof cause === "string"
        ? cause
        : String(cause ?? "unknown");
  console.error(
    JSON.stringify({
      type: "rate_limit_unavailable",
      requestId,
      message: redactForLogs(raw),
    })
  );
}

export function unavailableRateLimitDecision(cause: unknown): Extract<
  DeniedDurableRateLimitDecision,
  { kind: "unavailable" }
> {
  const requestId = crypto.randomUUID();
  logRateLimitInfrastructureFailure(requestId, cause);
  return { ok: false, kind: "unavailable", requestId };
}

export function interpretConsumeRateLimitResponse(input: {
  data: unknown;
  error: { message?: string } | null;
  thrown?: unknown;
}): DurableRateLimitDecision {
  if (input.thrown !== undefined) {
    return unavailableRateLimitDecision(input.thrown);
  }
  if (input.error) {
    return unavailableRateLimitDecision(input.error.message ?? "consume_rate_limit_error");
  }
  if (input.data === true) return { ok: true };
  if (input.data === false) return { ok: false, kind: "limited" };
  return unavailableRateLimitDecision(
    `invalid_response:${input.data === null ? "null" : typeof input.data}`
  );
}

export async function hashRateLimitBucket(bucket: string): Promise<string | null> {
  const secret = getRateLimitHmacSecret();
  if (!secret) return null;
  return (await hmacSha256Hex(secret, bucket)).slice(0, 64);
}

export async function runWithDurableRateLimit<T>(opts: {
  rpc: ConsumeRateLimitRpc;
  bucket: string;
  limit: number;
  windowSeconds: number;
  action: () => Promise<T> | T;
}): Promise<
  | { ok: true; value: T }
  | { ok: false; decision: DeniedDurableRateLimitDecision }
> {
  const key = await hashRateLimitBucket(opts.bucket);
  if (!key) {
    return {
      ok: false,
      decision: unavailableRateLimitDecision("missing_RATE_LIMIT_HMAC_SECRET"),
    };
  }
  let rpcResult: { data: unknown; error: { message?: string } | null };
  try {
    rpcResult = await opts.rpc({
      p_bucket: key,
      p_limit: opts.limit,
      p_window_seconds: opts.windowSeconds,
    });
  } catch (thrown) {
    return {
      ok: false,
      decision: unavailableRateLimitDecision(thrown),
    };
  }

  const decision = interpretConsumeRateLimitResponse(rpcResult);
  if (!decision.ok) return { ok: false, decision };
  return { ok: true, value: await opts.action() };
}

export function throwIfRateLimited(
  decision: DeniedDurableRateLimitDecision
): never {
  throw new SensitiveRateLimitError(decision);
}
