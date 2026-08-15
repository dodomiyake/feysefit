import { createClient } from "@/lib/supabase/server";
import {
  SENSITIVE_RATE_LIMITS,
  type SensitiveRateLimitKind,
  runWithDurableRateLimit,
  type DurableRateLimitDecision,
} from "@/lib/security/rate-limit-core";
import { rateLimitHttpResponse } from "@/server/http";
import { NextResponse } from "next/server";

export {
  RATE_LIMITED_CODE,
  RATE_LIMIT_UNAVAILABLE_CODE,
  RATE_LIMITED_MESSAGE,
  RATE_LIMIT_UNAVAILABLE_MESSAGE,
  SENSITIVE_RATE_LIMITS,
  SensitiveRateLimitError,
  interpretConsumeRateLimitResponse,
  runWithDurableRateLimit,
} from "@/lib/security/rate-limit-core";

export type { DurableRateLimitDecision, SensitiveRateLimitKind };

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Durable rate limit via Postgres `consume_rate_limit`.
 * Fail closed: errors, missing RPC, or non-boolean responses deny the action.
 */
export async function consumeDurableRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<DurableRateLimitDecision> {
  const supabase = await createClient();
  const result = await runWithDurableRateLimit({
    rpc: async (args) => await supabase.rpc("consume_rate_limit", args),
    bucket,
    limit,
    windowSeconds,
    action: () => true as const,
  });
  if (!result.ok) return result.decision;
  return { ok: true };
}

export async function runSensitiveHttpAction<T>(
  kind: SensitiveRateLimitKind,
  subject: string,
  action: () => Promise<T> | T
): Promise<{ ok: true; value: T } | { ok: false; response: NextResponse }> {
  const supabase = await createClient();
  const cfg = SENSITIVE_RATE_LIMITS[kind];
  const result = await runWithDurableRateLimit({
    rpc: async (args) => await supabase.rpc("consume_rate_limit", args),
    bucket: `${kind}:${subject}`,
    limit: cfg.limit,
    windowSeconds: cfg.windowSeconds,
    action,
  });
  if (!result.ok) {
    return { ok: false, response: rateLimitHttpResponse(result.decision) };
  }
  return { ok: true, value: result.value };
}
