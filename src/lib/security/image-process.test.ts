import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { processPublicImage, UploadValidationError } from "./image-process";
import { isBlockedUploadPayload, sniffImageMimeFromBytes } from "./upload-bytes";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

describe("upload magic bytes", () => {
  it("accepts a PNG signature", () => {
    assert.equal(sniffImageMimeFromBytes(PNG_1X1), "image/png");
  });

  it("blocks GIF and HTML", () => {
    assert.equal(isBlockedUploadPayload(Buffer.from("GIF89a....")), true);
    assert.equal(isBlockedUploadPayload(Buffer.from("<html><script>")), true);
    assert.equal(sniffImageMimeFromBytes(Buffer.from("GIF89a")), null);
  });
});

describe("server image re-encode", () => {
  it("decodes and re-encodes a PNG", async () => {
    const result = await processPublicImage(PNG_1X1);
    assert.equal(result.mime, "image/png");
    assert.equal(sniffImageMimeFromBytes(result.bytes), "image/png");
    assert.ok(result.width >= 1 && result.height >= 1);
  });

  it("rejects GIF at the trusted boundary", async () => {
    await assert.rejects(
      () => processPublicImage(Buffer.from("GIF89a............")),
      (error: unknown) => error instanceof UploadValidationError && error.code === "invalid_type"
    );
  });

  it("rejects a spoofed image/jpeg payload", async () => {
    await assert.rejects(
      () => processPublicImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>")),
      (error: unknown) => error instanceof UploadValidationError
    );
  });
});
