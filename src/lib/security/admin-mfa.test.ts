import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideAdminMfaAccess } from "./admin-mfa";

describe("administrator MFA fail-closed", () => {
  it("denies admin + AAL1", () => {
    assert.equal(
      decideAdminMfaAccess({
        isAdmin: true,
        aal: { currentLevel: "aal1", nextLevel: "aal2" },
        checkFailed: false,
      }),
      "challenge"
    );
  });

  it("allows admin + AAL2", () => {
    assert.equal(
      decideAdminMfaAccess({
        isAdmin: true,
        aal: { currentLevel: "aal2", nextLevel: "aal2" },
        checkFailed: false,
      }),
      "allow"
    );
  });

  it("does not treat non-admin + AAL2 as an admin grant", () => {
    assert.equal(
      decideAdminMfaAccess({
        isAdmin: false,
        aal: { currentLevel: "aal2", nextLevel: "aal2" },
        checkFailed: false,
      }),
      "allow"
    );
  });

  it("denies admin when the MFA API check fails", () => {
    assert.equal(
      decideAdminMfaAccess({
        isAdmin: true,
        aal: null,
        checkFailed: true,
      }),
      "deny"
    );
  });

  it("leaves non-admin traffic available when MFA check fails", () => {
    assert.equal(
      decideAdminMfaAccess({
        isAdmin: false,
        aal: null,
        checkFailed: true,
      }),
      "allow"
    );
  });
});
