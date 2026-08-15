import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPasswordStrongEnough, MIN_PASSWORD_LENGTH } from "./auth-security";

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
