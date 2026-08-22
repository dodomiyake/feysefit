import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  handleApiError,
  PUBLIC_INTERNAL_ERROR,
  PUBLIC_INTERNAL_ERROR_CODE,
  redactForLogs,
} from "./http";
import { SensitiveRateLimitError } from "@/lib/security/rate-limit-core";

describe("handleApiError", () => {
  it("does not send internal database text to the client", async () => {
    const response = handleApiError(
      new Error("relation public.internal_objects does not exist")
    );
    const body = (await response.json()) as {
      error: string;
      code: string;
      requestId: string;
    };
    assert.equal(response.status, 500);
    assert.equal(body.error, PUBLIC_INTERNAL_ERROR);
    assert.equal(body.code, PUBLIC_INTERNAL_ERROR_CODE);
    assert.equal(body.error.includes("internal_objects"), false);
    assert.equal(body.error.includes("relation"), false);
    assert.equal(typeof body.requestId, "string");
    assert.ok(body.requestId.length > 8);
  });

  it("maps SensitiveRateLimitError to HTTP 503 without provider text", async () => {
    const response = handleApiError(
      new SensitiveRateLimitError({
        ok: false,
        kind: "unavailable",
        requestId: "req-rate-limit-1",
      })
    );
    const body = (await response.json()) as { error: string; code: string; requestId: string };
    assert.equal(response.status, 503);
    assert.equal(body.code, "rate_limit_unavailable");
    assert.equal(body.requestId, "req-rate-limit-1");
    assert.equal(body.error.includes("relation"), false);
  });

  it("redacts emails and tokens from log strings", () => {
    const redacted = redactForLogs("Bearer abc.def.ghi user@example.com");
    assert.equal(redacted.includes("user@example.com"), false);
    assert.equal(redacted.includes("Bearer abc"), false);
  });
});
