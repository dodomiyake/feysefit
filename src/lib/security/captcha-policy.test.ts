import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  captchaProductionBlockReason,
  consumeSingleUseToken,
  requireCaptchaToken,
} from "./captcha-policy";

describe("captcha policy", () => {
  it("fails closed in production when the site key is missing", () => {
    const previousEnv = process.env.NODE_ENV;
    const previousKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    Object.assign(process.env, { NODE_ENV: "production" });
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    try {
      assert.equal(typeof captchaProductionBlockReason(), "string");
      const blocked = requireCaptchaToken("token-from-attacker");
      assert.equal(typeof blocked, "string");
    } finally {
      Object.assign(process.env, { NODE_ENV: previousEnv });
      if (previousKey === undefined) delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      else process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = previousKey;
    }
  });

  it("rejects a missing token when the site key is configured", () => {
    const previousKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site-key";
    try {
      assert.equal(typeof requireCaptchaToken(""), "string");
      assert.equal(requireCaptchaToken("solved-token"), null);
    } finally {
      if (previousKey === undefined) delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
      else process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = previousKey;
    }
  });

  it("consumes a token so it cannot be reused from client state", () => {
    const first = consumeSingleUseToken("abc");
    assert.equal(first.token, "abc");
    assert.equal(first.remaining, null);
    const second = consumeSingleUseToken(first.remaining);
    assert.equal(second.token, null);
  });
});
