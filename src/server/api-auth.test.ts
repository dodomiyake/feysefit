import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertLegacyApiEnabled } from "./api-auth";

describe("legacy API route guard", () => {
  it("returns 404 when the Prisma API is disabled", async () => {
    const response = assertLegacyApiEnabled();
    assert.ok(response);
    assert.equal(response.status, 404);
    const body = (await response.json()) as { error: string; code: string };
    assert.equal(body.code, "not_found");
  });
});
