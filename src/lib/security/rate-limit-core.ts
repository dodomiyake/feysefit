import { redactForLogs } from "@/lib/security/redact";

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
  referencePreview: { limit: 30, windowSeconds: 60 },
} as const;

export type SensitiveRateLimitKind = keyof typeof SENSITIVE_RATE_LIMITS;

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

export async function hashRateLimitBucket(bucket: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(bucket)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  )
    .join("")
    .slice(0, 64);
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
