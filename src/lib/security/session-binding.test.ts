import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sessionBindingFromAccessToken } from "./session-binding";

function unsignedJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

const USER = "11111111-1111-4111-8111-111111111111";
const SESSION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("session binding from validated claims", () => {
  it("requires session_id and matching sub from the access token", () => {
    const token = unsignedJwt({
      sub: USER,
      session_id: SESSION,
      iat: Math.floor(Date.now() / 1000),
    });
    const binding = sessionBindingFromAccessToken({ userId: USER, accessToken: token });
    assert.ok(binding);
    assert.equal(binding?.sessionId, SESSION);
  });

  it("rejects a token whose sub does not match getUser() id", () => {
    const token = unsignedJwt({
      sub: "22222222-2222-4222-8222-222222222222",
      session_id: SESSION,
      iat: Math.floor(Date.now() / 1000),
    });
    assert.equal(sessionBindingFromAccessToken({ userId: USER, accessToken: token }), null);
  });

  it("rejects a token without session_id", () => {
    const token = unsignedJwt({ sub: USER, iat: Math.floor(Date.now() / 1000) });
    assert.equal(sessionBindingFromAccessToken({ userId: USER, accessToken: token }), null);
  });
});
