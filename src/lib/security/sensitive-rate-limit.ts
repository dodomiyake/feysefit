import { createClient } from "@/lib/supabase/client";
import {
  SENSITIVE_RATE_LIMITS,
  type SensitiveRateLimitKind,
  runWithDurableRateLimit,
  throwIfRateLimited,
} from "@/lib/security/rate-limit-core";

export async function runSensitiveAction<T>(
  kind: SensitiveRateLimitKind,
  subject: string,
  action: () => Promise<T> | T
): Promise<T> {
  const supabase = createClient();
  const cfg = SENSITIVE_RATE_LIMITS[kind];
  const result = await runWithDurableRateLimit({
    rpc: async (args) => await supabase.rpc("consume_rate_limit", args),
    bucket: `${kind}:${subject}`,
    limit: cfg.limit,
    windowSeconds: cfg.windowSeconds,
    action,
  });
  if (!result.ok) throwIfRateLimited(result.decision);
  return result.value;
}
