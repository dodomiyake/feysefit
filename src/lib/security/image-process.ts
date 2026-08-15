import "server-only";

import sharp from "sharp";
import {
  isBlockedUploadPayload,
  sniffImageMimeFromBytes,
  type TrustedImageMime,
} from "@/lib/security/upload-bytes";
import { MAX_STORAGE_IMAGE_BYTES } from "@/lib/storage/buckets";

export const MAX_IMAGE_DIMENSION = 4096;
export const MAX_INPUT_PIXELS = MAX_IMAGE_DIMENSION * MAX_IMAGE_DIMENSION;

export type ProcessedPublicImage = {
  bytes: Buffer;
  mime: TrustedImageMime;
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
};

const MIME_TO_EXT: Record<TrustedImageMime, ProcessedPublicImage["extension"]> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class UploadValidationError extends Error {
  readonly code: "invalid_type" | "too_large" | "too_many_pixels" | "decode_failed";
  constructor(code: UploadValidationError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "UploadValidationError";
  }
}

/**
 * Trusted-boundary image processing: magic bytes, decode, re-encode, strip metadata.
 * GIF remains disabled. This is not malware scanning.
 */
export async function processPublicImage(bytes: Uint8Array): Promise<ProcessedPublicImage> {
  if (bytes.byteLength > MAX_STORAGE_IMAGE_BYTES) {
    throw new UploadValidationError("too_large", "Image is too large.");
  }
  if (isBlockedUploadPayload(bytes) || !sniffImageMimeFromBytes(bytes)) {
    throw new UploadValidationError("invalid_type", "Only JPEG, PNG, or WebP images are allowed.");
  }
  const sniffed = sniffImageMimeFromBytes(bytes)!;

  let pipeline: ReturnType<typeof sharp>;
  try {
    pipeline = sharp(bytes, {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
    }).rotate();
  } catch {
    throw new UploadValidationError("decode_failed", "That image could not be processed.");
  }

  let info: { width: number; height: number };
  let output: Buffer;
  try {
    const meta = await pipeline.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width < 1 || height < 1) {
      throw new UploadValidationError("decode_failed", "That image could not be processed.");
    }
    if (width * height > MAX_INPUT_PIXELS || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      throw new UploadValidationError("too_many_pixels", "Image dimensions are too large.");
    }

    const resized = pipeline.resize({
      width: MAX_IMAGE_DIMENSION,
      height: MAX_IMAGE_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    });

    if (sniffed === "image/png") {
      ({ data: output, info } = await resized.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true }));
    } else if (sniffed === "image/webp") {
      ({ data: output, info } = await resized.webp({ quality: 82 }).toBuffer({ resolveWithObject: true }));
    } else {
      ({ data: output, info } = await resized.jpeg({ quality: 85, mozjpeg: true }).toBuffer({ resolveWithObject: true }));
    }
  } catch (error) {
    if (error instanceof UploadValidationError) throw error;
    throw new UploadValidationError("decode_failed", "That image could not be processed.");
  }

  if (output.byteLength > MAX_STORAGE_IMAGE_BYTES) {
    throw new UploadValidationError("too_large", "Image is too large.");
  }

  return {
    bytes: output,
    mime: sniffed,
    extension: MIME_TO_EXT[sniffed],
    width: info.width,
    height: info.height,
  };
}
