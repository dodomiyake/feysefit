import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import {
  RATE_LIMIT_UNAVAILABLE_CODE,
  RATE_LIMIT_UNAVAILABLE_MESSAGE,
  RATE_LIMITED_CODE,
  interpretConsumeRateLimitResponse,
  runWithDurableRateLimit,
  type ConsumeRateLimitRpc,
} from "./rate-limit-core";
import { rateLimitHttpResponse } from "@/server/http";

const PROVIDER_ERROR = "relation public.rate_limit_counters does not exist";

const KINDS = [
  "auth-abuse",
  "admin-mutation",
  "security-event",
  "design-request",
  "messaging-write",
] as const;

function failingRpc(
  response: { data: unknown; error: { message?: string } | null } | Error
): ConsumeRateLimitRpc {
  return async () => {
    if (response instanceof Error) throw response;
    return response;
  };
}

describe("durable rate limit fail-closed", () => {
  for (const kind of KINDS) {
    it(`${kind}: does not run the protected action when consume_rate_limit errors`, async () => {
      let called = 0;
      const result = await runWithDurableRateLimit({
        rpc: failingRpc({ data: null, error: { message: PROVIDER_ERROR } }),
        bucket: `${kind}:actor`,
        limit: 10,
        windowSeconds: 60,
        action: () => {
          called += 1;
          return "mutated";
        },
      });

      assert.equal(called, 0);
      assert.equal(result.ok, false);
      if (result.ok) throw new Error("expected deny");
      assert.equal(result.decision.kind, "unavailable");

      const response = rateLimitHttpResponse(result.decision);
      const body = (await response.json()) as {
        error: string;
        code: string;
        requestId?: string;
      };
      assert.equal(response.status, 503);
      assert.equal(body.code, RATE_LIMIT_UNAVAILABLE_CODE);
      assert.equal(body.error, RATE_LIMIT_UNAVAILABLE_MESSAGE);
      assert.equal(body.error.includes("rate_limit_counters"), false);
      assert.equal(body.error.includes("relation"), false);
      assert.equal(typeof body.requestId, "string");
    });
  }

  it("does not run the protected action when the RPC throws", async () => {
    let called = 0;
    const result = await runWithDurableRateLimit({
      rpc: failingRpc(new Error("fetch failed: password=supersecret")),
      bucket: "security-event:actor",
      limit: 10,
      windowSeconds: 60,
      action: () => {
        called += 1;
      },
    });
    assert.equal(called, 0);
    assert.equal(result.ok, false);
  });

  it("does not run the protected action when consume_rate_limit returns NULL", async () => {
    let called = 0;
    const result = await runWithDurableRateLimit({
      rpc: failingRpc({ data: null, error: null }),
      bucket: "auth-abuse:actor",
      limit: 10,
      windowSeconds: 60,
      action: () => {
        called += 1;
      },
    });
    assert.equal(called, 0);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.decision.kind, "unavailable");
      const response = rateLimitHttpResponse(result.decision);
      const body = (await response.json()) as { code: string };
      assert.equal(response.status, 503);
      assert.equal(body.code, RATE_LIMIT_UNAVAILABLE_CODE);
    }
  });

  it("does not run the protected action on a non-boolean RPC payload", async () => {
    let called = 0;
    const result = await runWithDurableRateLimit({
      rpc: failingRpc({ data: "yes", error: null }),
      bucket: "admin-mutation:actor",
      limit: 10,
      windowSeconds: 60,
      action: () => {
        called += 1;
      },
    });
    assert.equal(called, 0);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.decision.kind, "unavailable");
  });

  it("does not run the protected action when the caller is rate limited", async () => {
    let called = 0;
    const result = await runWithDurableRateLimit({
      rpc: failingRpc({ data: false, error: null }),
      bucket: "messaging-write:actor",
      limit: 10,
      windowSeconds: 60,
      action: () => {
        called += 1;
      },
    });
    assert.equal(called, 0);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.decision.kind, "limited");
      const response = rateLimitHttpResponse(result.decision);
      const body = (await response.json()) as { code: string };
      assert.equal(response.status, 429);
      assert.equal(body.code, RATE_LIMITED_CODE);
    }
  });

  it("runs the protected action only when consume_rate_limit returns true", async () => {
    let called = 0;
    const result = await runWithDurableRateLimit({
      rpc: failingRpc({ data: true, error: null }),
      bucket: "design-request:actor",
      limit: 10,
      windowSeconds: 60,
      action: () => {
        called += 1;
        return "created";
      },
    });
    assert.equal(called, 1);
    assert.deepEqual(result, { ok: true, value: "created" });
  });

  it("logs infrastructure failure with requestId and redaction, not the public body", async () => {
    const errors: unknown[][] = [];
    const spy = mock.method(console, "error", (...args: unknown[]) => {
      errors.push(args);
    });
    try {
      const decision = interpretConsumeRateLimitResponse({
        data: null,
        error: { message: "permission denied for user@example.com" },
      });
      assert.equal(decision.ok, false);
      if (decision.ok || decision.kind !== "unavailable") {
        throw new Error("expected unavailable");
      }
      assert.equal(errors.length, 1);
      const payload = String(errors[0]?.[0] ?? "");
      assert.equal(payload.includes(decision.requestId), true);
      assert.equal(payload.includes("rate_limit_unavailable"), true);
      assert.equal(payload.includes("user@example.com"), false);
      assert.equal(payload.includes("[redacted-email]"), true);

      const response = rateLimitHttpResponse(decision);
      const body = (await response.json()) as { error: string };
      assert.equal(body.error.includes("permission denied"), false);
      assert.equal(body.error.includes("example.com"), false);
    } finally {
      spy.mock.restore();
    }
  });
});
