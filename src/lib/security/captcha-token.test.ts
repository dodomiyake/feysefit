import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { storeOneTimeToken, takeOneTimeToken } from "./captcha-token";

describe("one-time CAPTCHA token", () => {
  it("can be consumed exactly once", () => {
    const slot = { current: null as string | null };

    assert.equal(storeOneTimeToken(slot, "  fresh-token  "), "fresh-token");
    assert.equal(takeOneTimeToken(slot), "fresh-token");
    assert.equal(takeOneTimeToken(slot), null);
  });

  it("does not retain blank tokens", () => {
    const slot = { current: "old-token" as string | null };

    assert.equal(storeOneTimeToken(slot, "   "), null);
    assert.equal(takeOneTimeToken(slot), null);
  });
});
