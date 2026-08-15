export function sniffImageMimeFromBytes(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function isBlockedUploadPayload(bytes: Uint8Array): boolean {
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return true;
  }
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 256)).toLowerCase();
  return (
    head.includes("<svg") ||
    head.includes("<html") ||
    head.includes("<!doctype html") ||
    head.includes("<?xml")
  );
}

export const TRUSTED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export type TrustedImageMime = (typeof TRUSTED_IMAGE_MIMES)[number];
