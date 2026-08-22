import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPasswordStrongEnough, MIN_PASSWORD_LENGTH, toGenericLoginError, toGenericMfaError } from "./auth-security";

describe("password policy", () => {
  it("requires at least 12 characters", () => {
    assert.equal(MIN_PASSWORD_LENGTH, 12);
    assert.equal(isPasswordStrongEnough("short"), false);
    assert.equal(isPasswordStrongEnough("elevenchars"), false);
    assert.equal(isPasswordStrongEnough("twelve chars"), true);
  });

  it("allows long passphrases without a symbol class", () => {
    assert.equal(isPasswordStrongEnough("correct horse battery staple extra"), true);
  });
});

describe("generic auth errors", () => {
  it("never returns injected provider or database details", () => {
    const payloads = [
      "invalid login for user@example.com",
      'relation "users" does not exist',
      "https://attacker.example/steal?token=abc.def.ghi",
      "JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb leaked",
      "Error: at AuthApi.signIn (auth.ts:12:3)",
    ];
    for (const payload of payloads) {
      const login = toGenericLoginError(payload);
      const mfa = toGenericMfaError(payload);
      assert.equal(login.includes("user@example.com"), false);
      assert.equal(login.includes("relation"), false);
      assert.equal(login.includes("attacker.example"), false);
      assert.equal(login.includes("eyJ"), false);
      assert.equal(login.includes("auth.ts"), false);
      assert.equal(mfa.includes(payload), false);
    }
  });
});
