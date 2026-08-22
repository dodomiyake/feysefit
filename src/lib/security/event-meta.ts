import type { Json } from "@/lib/types/database";

const MAX_ENCODED_BYTES = 2048;
const MAX_DEPTH = 2;
const MAX_KEYS = 16;

const ALLOWED_KEYS = new Set([
  "source",
  "reason",
  "outcome",
  "flow",
  "method",
  "status",
  "count",
  "limited",
  "portal",
  "role",
]);

const BLOCKED_KEY_RE =
  /pass(word)?|token|secret|cookie|authorization|captcha|turnstile|card|pan|cvv|iban|account.?number/i;

function isScalar(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function sanitizeValue(value: unknown, depth: number): Json | undefined {
  if (depth > MAX_DEPTH) return undefined;
  if (isScalar(value)) {
    if (typeof value === "string" && value.length > 256) return value.slice(0, 256);
    if (typeof value === "number" && !Number.isFinite(value)) return undefined;
    return value;
  }
  if (Array.isArray(value)) return undefined;
  if (!value || typeof value !== "object") return undefined;

  const output: Record<string, Json> = {};
  let keys = 0;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (keys >= MAX_KEYS) break;
    if (!ALLOWED_KEYS.has(key) || BLOCKED_KEY_RE.test(key)) continue;
    const cleaned = sanitizeValue(nested, depth + 1);
    if (cleaned === undefined) continue;
    output[key] = cleaned;
    keys += 1;
  }
  return output;
}

export function sanitizeEventMeta(input: unknown): Json {
  const cleaned = sanitizeValue(input ?? {}, 0);
  const meta = cleaned && typeof cleaned === "object" && !Array.isArray(cleaned) ? cleaned : {};
  const encoded = JSON.stringify(meta);
  if (encoded.length > MAX_ENCODED_BYTES) {
    return { truncated: true };
  }
  return meta;
}
