import "server-only";

import { createServiceClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import {
  RATE_LIMIT_OPERATIONS,
  hashRateLimitBucket,
  interpretConsumeRateLimitResponse,
  unavailableRateLimitDecision,
  type DurableRateLimitDecision,
  type SensitiveRateLimitKind,
} from "@/lib/security/rate-limit-core";
import { rateLimitHttpResponse } from "@/server/http";
import { NextResponse } from "next/server";
import { clientIpFromHeaders } from "@/lib/security/client-ip";

export {
  RATE_LIMITED_CODE,
  RATE_LIMIT_UNAVAILABLE_CODE,
  RATE_LIMITED_MESSAGE,
  RATE_LIMIT_UNAVAILABLE_MESSAGE,
  RATE_LIMIT_OPERATIONS,
  SENSITIVE_RATE_LIMITS,
  SensitiveRateLimitError,
  interpretConsumeRateLimitResponse,
  runWithDurableRateLimit,
} from "@/lib/security/rate-limit-core";

export type { DurableRateLimitDecision, SensitiveRateLimitKind };
export { clientIpFromHeaders };

/**
 * Durable rate limit via app_private policies, called only with the service role.
 * Limits and windows are selected in SQL from the operation name, not by the caller.
 */
export async function consumeDurableRateLimit(
  kind: SensitiveRateLimitKind,
  subject: string
): Promise<DurableRateLimitDecision> {
  const hashed = await hashRateLimitBucket(`${kind}:${subject}`);
  if (!hashed) {
    return unavailableRateLimitDecision("missing_RATE_LIMIT_HMAC_SECRET");
  }
  if (!isServiceRoleConfigured()) {
    return unavailableRateLimitDecision("service_role_unconfigured");
  }

  try {
    const admin = createServiceClient();
    const rpcResult = await admin.rpc("consume_rate_limit_server", {
      p_operation: RATE_LIMIT_OPERATIONS[kind],
      p_bucket: hashed,
    });
    return interpretConsumeRateLimitResponse(rpcResult);
  } catch (thrown) {
    return unavailableRateLimitDecision(thrown);
  }
}

export async function runSensitiveHttpAction<T>(
  kind: SensitiveRateLimitKind,
  subject: string,
  action: () => Promise<T> | T
): Promise<{ ok: true; value: T } | { ok: false; response: NextResponse }> {
  const decision = await consumeDurableRateLimit(kind, subject);
  if (!decision.ok) {
    return { ok: false, response: rateLimitHttpResponse(decision) };
  }
  return { ok: true, value: await action() };
}
