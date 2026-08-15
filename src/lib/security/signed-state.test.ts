import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { issueSignedState, verifySignedState } from "./signed-state";

const SECRET = "unit-test-security-cookie-secret-not-for-production";
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const SESSION_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SESSION_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("signed security cookies", () => {
  it("rejects a forged numeric timestamp as a reauth grant", async () => {
    const result = await verifySignedState({
      token: String(Date.now()),
      purpose: "reauth",
      userId: USER_A,
      sessionId: SESSION_A,
      secret: SECRET,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "malformed");
  });

  it("rejects a modified token", async () => {
    const token = await issueSignedState({
      purpose: "reauth",
      userId: USER_A,
      sessionId: SESSION_A,
      issuedAtMs: Date.now(),
      expiresAtMs: Date.now() + 60_000,
      secret: SECRET,
    });
    assert.ok(token);
    const result = await verifySignedState({
      token: `${token!.slice(0, -2)}aa`,
      purpose: "reauth",
      userId: USER_A,
      sessionId: SESSION_A,
      secret: SECRET,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "modified");
  });

  it("rejects a token from another user", async () => {
    const token = await issueSignedState({
      purpose: "reauth",
      userId: USER_A,
      sessionId: SESSION_A,
      issuedAtMs: Date.now(),
      expiresAtMs: Date.now() + 60_000,
      secret: SECRET,
    });
    const result = await verifySignedState({
      token: token!,
      purpose: "reauth",
      userId: USER_B,
      sessionId: SESSION_A,
      secret: SECRET,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "wrong_user");
  });

  it("rejects a token from another session", async () => {
    const token = await issueSignedState({
      purpose: "last_activity",
      userId: USER_A,
      sessionId: SESSION_A,
      issuedAtMs: Date.now(),
      expiresAtMs: Date.now() + 60_000,
      secret: SECRET,
    });
    const result = await verifySignedState({
      token: token!,
      purpose: "last_activity",
      userId: USER_A,
      sessionId: SESSION_B,
      secret: SECRET,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "wrong_session");
  });

  it("rejects expired tokens", async () => {
    const token = await issueSignedState({
      purpose: "session_started",
      userId: USER_A,
      sessionId: SESSION_A,
      issuedAtMs: 1_000,
      expiresAtMs: 2_000,
      secret: SECRET,
    });
    const result = await verifySignedState({
      token: token!,
      purpose: "session_started",
      userId: USER_A,
      sessionId: SESSION_A,
      nowMs: 3_000,
      secret: SECRET,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "expired");
  });

  it("accepts a valid grant for the bound user and session", async () => {
    const now = Date.now();
    const token = await issueSignedState({
      purpose: "reauth",
      userId: USER_A,
      sessionId: SESSION_A,
      issuedAtMs: now,
      expiresAtMs: now + 60_000,
      secret: SECRET,
    });
    const result = await verifySignedState({
      token: token!,
      purpose: "reauth",
      userId: USER_A,
      sessionId: SESSION_A,
      nowMs: now + 1_000,
      secret: SECRET,
    });
    assert.equal(result.ok, true);
  });

  it("verifies a token after secret rotation using the previous secret", async () => {
    const now = Date.now();
    const previous = "previous-security-cookie-secret-not-for-production";
    const current = "current-security-cookie-secret-not-for-production";
    const token = await issueSignedState({
      purpose: "reauth",
      userId: USER_A,
      sessionId: SESSION_A,
      issuedAtMs: now,
      expiresAtMs: now + 60_000,
      secret: previous,
    });
    const result = await verifySignedState({
      token: token!,
      purpose: "reauth",
      userId: USER_A,
      sessionId: SESSION_A,
      nowMs: now + 1_000,
      secret: current,
      previousSecret: previous,
    });
    assert.equal(result.ok, true);
  });
});
