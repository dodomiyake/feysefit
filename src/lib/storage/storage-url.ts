import { STORAGE_BUCKETS, type StorageBucket } from "@/lib/storage/buckets";

const PRIVATE_STORAGE_BUCKETS = new Set<StorageBucket>([
  STORAGE_BUCKETS.messageAttachments,
  STORAGE_BUCKETS.projectReferences,
  STORAGE_BUCKETS.projectProgress,
  STORAGE_BUCKETS.customerInspiration,
  STORAGE_BUCKETS.uploadsQuarantine,
]);

const KNOWN_STORAGE_BUCKETS = new Set<string>(Object.values(STORAGE_BUCKETS));

export function isPrivateStorageBucket(bucket: StorageBucket) {
  return PRIVATE_STORAGE_BUCKETS.has(bucket);
}

export function isKnownStorageBucket(bucket: string): bucket is StorageBucket {
  return KNOWN_STORAGE_BUCKETS.has(bucket);
}

export interface ParsedStorageObject {
  bucket: StorageBucket;
  path: string;
}

const UUID_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Parse Supabase storage URLs (public or signed) into bucket + object path. */
export function parseStorageObjectUrl(url: string): ParsedStorageObject | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/";
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;

    const remainder = parsed.pathname.slice(index + marker.length);
    const segments = remainder.split("/").filter(Boolean);
    if (segments.length < 2) return null;

    const accessType = segments[0];
    if (accessType !== "public" && accessType !== "sign" && accessType !== "authenticated") {
      return null;
    }

    const bucket = segments[1];
    if (!isKnownStorageBucket(bucket)) return null;

    let path = segments.slice(2).join("/");
    // Signed URLs may include a token segment after the object path.
    if (accessType === "sign") {
      const decode = path.includes("%") ? decodeURIComponent(path) : path;
      path = decode.split("?")[0] ?? decode;
    }
    if (!path) return null;

    return { bucket, path };
  } catch {
    return null;
  }
}

export function isPrivateStorageUrl(url: string): boolean {
  const parsed = parseStorageObjectUrl(url);
  return parsed ? isPrivateStorageBucket(parsed.bucket) : false;
}

/** First folder is owner user id; optional second UUID folder is a project scope. */
export function getStoragePathScope(path: string): {
  ownerId: string | null;
  projectId: string | null;
} {
  const parts = path.split("/").filter(Boolean);
  const ownerId = parts[0] ?? null;
  const second = parts[1] ?? null;
  const projectId = second && UUID_SEGMENT.test(second) ? second : null;
  return { ownerId, projectId };
}

export function buildOwnedObjectPath(
  ownerId: string,
  fileName: string,
  projectId?: string | null
): string {
  const safeOwner = ownerId.trim();
  const safeName = fileName.replace(/^\/+/, "");
  if (projectId?.trim()) {
    return `${safeOwner}/${projectId.trim()}/${safeName}`;
  }
  return `${safeOwner}/${safeName}`;
}
