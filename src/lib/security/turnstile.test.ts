import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicTurnstileError, verifyTurnstileToken } from "./turnstile";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Turnstile server verification", () => {
  it("rejects a missing token", async () => {
    const result = await verifyTurnstileToken("", {
      secret: "test-secret",
      fetchImpl: async () => jsonResponse({ success: true }),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "missing_token");
  });

  it("rejects an invalid token", async () => {
    const result = await verifyTurnstileToken("bad", {
      secret: "test-secret",
      fetchImpl: async () => jsonResponse({ success: false, "error-codes": ["invalid-input-response"] }),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "invalid");
  });

  it("rejects an expired token", async () => {
    const result = await verifyTurnstileToken("stale", {
      secret: "test-secret",
      fetchImpl: async () => jsonResponse({ success: false, "error-codes": ["expired-input-response"] }),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "expired");
  });

  it("rejects a reused token", async () => {
    const result = await verifyTurnstileToken("used", {
      secret: "test-secret",
      fetchImpl: async () => jsonResponse({ success: false, "error-codes": ["timeout-or-duplicate"] }),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "reused");
    assert.equal(publicTurnstileError("reused").includes("timeout-or-duplicate"), false);
  });

  it("fails closed when the secret is missing", async () => {
    const result = await verifyTurnstileToken("token", { secret: "", fetchImpl: async () => jsonResponse({ success: true }) });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "missing_secret");
  });
});
