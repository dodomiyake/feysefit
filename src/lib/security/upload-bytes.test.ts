import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBlockedUploadPayload, sniffImageMimeFromBytes } from "./upload-bytes";

describe("upload-bytes", () => {
  it("does not trust a JPEG content-type without a JPEG signature", () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
    assert.equal(sniffImageMimeFromBytes(bytes), null);
  });

  it("blocks GIF regardless of claimed MIME", () => {
    assert.equal(isBlockedUploadPayload(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])), true);
  });
});
