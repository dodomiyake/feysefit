import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertAuthAttemptAllowed } from "./auth-abuse";

describe("auth abuse captcha gate", () => {
  it("blocks production attempts when Turnstile is not configured", () => {
    const previousEnv = process.env.NODE_ENV;
    const previousKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    Object.assign(process.env, { NODE_ENV: "production" });
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    try {
      const message = assertAuthAttemptAllowed("login", "user@example.com", "any-token");
      assert.equal(typeof message, "string");
    } finally {
      Object.assign(process.env, { NODE_ENV: previousEnv });
      if (previousKey === undefined) delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      else process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = previousKey;
    }
  });
});
