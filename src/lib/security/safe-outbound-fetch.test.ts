import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAllowedPinterestUrl } from "./safe-outbound-fetch";
import { isBlockedUploadPayload, sniffImageMimeFromBytes } from "./upload-bytes";

describe("Pinterest outbound URL checks", () => {
  it("rejects loopback, metadata, credentials, and non-https", () => {
    assert.equal(isAllowedPinterestUrl("http://pinterest.com/pin/1").ok, false);
    assert.equal(isAllowedPinterestUrl("https://127.0.0.1/pin/1").ok, false);
    assert.equal(isAllowedPinterestUrl("https://169.254.169.254/latest/meta-data").ok, false);
    assert.equal(isAllowedPinterestUrl("https://user:pass@pinterest.com/pin/1").ok, false);
    assert.equal(isAllowedPinterestUrl("https://evil.example/pin/1").ok, false);
    assert.equal(isAllowedPinterestUrl("https://www.pinterest.com/pin/1").ok, true);
  });
});

describe("upload magic bytes", () => {
  it("accepts jpeg/png/webp and rejects gif and html", () => {
    assert.equal(sniffImageMimeFromBytes(Uint8Array.from([0xff, 0xd8, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])), "image/jpeg");
    assert.equal(
      sniffImageMimeFromBytes(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00])),
      "image/png"
    );
    assert.equal(isBlockedUploadPayload(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])), true);
    assert.equal(isBlockedUploadPayload(new TextEncoder().encode("<html><script>alert(1)</script>")), true);
  });
});
