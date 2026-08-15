import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { marketplaceBackHref, marketplaceDirectoryState } from "./marketplace-display";

describe("marketplaceDirectoryState", () => {
  it("does not treat an unloaded directory as empty", () => {
    assert.equal(
      marketplaceDirectoryState({ marketplaceReady: false, liveCount: 0, filteredCount: 0 }),
      "loading"
    );
  });

  it("shows the live empty copy only after loading completes", () => {
    assert.equal(
      marketplaceDirectoryState({ marketplaceReady: true, liveCount: 0, filteredCount: 0 }),
      "empty-live"
    );
  });

  it("does not treat a failed load as an empty marketplace", () => {
    assert.equal(
      marketplaceDirectoryState({
        marketplaceReady: true,
        marketplaceError: true,
        liveCount: 0,
        filteredCount: 0,
      }),
      "error"
    );
  });

  it("distinguishes filter misses from an empty marketplace", () => {
    assert.equal(
      marketplaceDirectoryState({ marketplaceReady: true, liveCount: 3, filteredCount: 0 }),
      "empty-filters"
    );
    assert.equal(
      marketplaceDirectoryState({ marketplaceReady: true, liveCount: 3, filteredCount: 2 }),
      "results"
    );
  });
});

describe("marketplaceBackHref", () => {
  it("sends signed-out visitors home", () => {
    assert.equal(marketplaceBackHref(null), "/");
  });

  it("sends signed-in users to their dashboard", () => {
    assert.equal(marketplaceBackHref("designer"), "/dashboard/designer");
    assert.equal(marketplaceBackHref("customer"), "/dashboard/customer");
    assert.equal(marketplaceBackHref("admin"), "/dashboard/admin");
  });
});
