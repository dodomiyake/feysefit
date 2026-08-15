import { createClient } from "@/lib/supabase/client";
import { assertMessageAttachmentFile } from "@/lib/messages/attachment-utils";
import { legacyOrIdFilter, isUuid } from "@/lib/legacy-id-lookup";
import {
  MAX_STORAGE_IMAGE_BYTES,
  STORAGE_BUCKETS,
  STORAGE_DOCUMENT_TYPES,
  STORAGE_IMAGE_TYPES,
  type StorageBucket,
} from "@/lib/storage/buckets";
import {
  buildOwnedObjectPath,
  isPrivateStorageBucket,
  parseStorageObjectUrl,
} from "@/lib/storage/storage-url";

/** Short-lived display URLs only — never persist these. */
const SIGNED_URL_TTL_SECONDS = 5 * 60;

const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "js",
  "mjs",
  "cjs",
  "vbs",
  "ps1",
  "sh",
  "bash",
  "dll",
  "so",
  "dylib",
  "apk",
  "jar",
  "html",
  "htm",
  "svg",
  "xhtml",
  "php",
  "asp",
  "aspx",
  "jsp",
  "cgi",
  "py",
  "rb",
  "pl",
]);

const IMAGE_MIME = new Set<string>(STORAGE_IMAGE_TYPES);
const DOCUMENT_MIME = new Set<string>(STORAGE_DOCUMENT_TYPES);

function getFileExtension(file: File) {
  const fromName = file.name.includes(".") ? file.name.split(".").pop() : null;
  if (fromName && /^[a-z0-9]+$/i.test(fromName)) return fromName.toLowerCase();

  const mimeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/plain": "txt",
  };
  return mimeMap[file.type] || "";
}

function assertNotExecutable(file: File) {
  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase()
    : undefined;
  if (extension && BLOCKED_EXTENSIONS.has(extension)) {
    throw new Error("This file type is not allowed.");
  }
  if (!file.type || file.type === "application/octet-stream" || file.type === "application/x-msdownload") {
    if (extension && BLOCKED_EXTENSIONS.has(extension)) {
      throw new Error("This file type is not allowed.");
    }
  }
}

async function sniffImageMime(file: File): Promise<string | null> {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  } catch {
    return null;
  }
  if (bytes.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // GIF is not accepted (no safe re-encode path in this pass).
  // WebP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Strict content-based image validation. Returns a user-facing error naming the file,
 * or null when the image is valid. The detected canonical MIME is what uploads use.
 */
export async function validateImageFile(file: File): Promise<string | null> {
  const extension = getFileExtension(file);
  if (extension && BLOCKED_EXTENSIONS.has(extension)) {
    return `"${file.name}" is not allowed.`;
  }
  const detected = await sniffImageMime(file);
  if (!detected) {
    return `"${file.name}" is not a supported image. Use JPG, PNG, or WebP.`;
  }
  if (file.size > MAX_STORAGE_IMAGE_BYTES) {
    return `"${file.name}" is larger than 5MB. Compress it and try again.`;
  }
  return null;
}

async function assertImageFile(file: File): Promise<string> {
  assertNotExecutable(file);
  const error = await validateImageFile(file);
  if (error) throw new Error(error);
  const detected = await sniffImageMime(file);
  if (!detected) throw new Error(`"${file.name}" is not a supported image.`);
  return detected;
}

/** Durable public-shaped URL for DB persistence (not readable if the bucket is private). */
function durableObjectUrl(bucket: StorageBucket, path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Resolve app project id / legacy id to the Postgres UUID used in storage paths. */
async function resolveProjectUuidForStorage(
  projectId?: string | null
): Promise<string | null> {
  const trimmed = projectId?.trim();
  if (!trimmed) return null;
  if (isUuid(trimmed)) return trimmed;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .or(legacyOrIdFilter(trimmed))
    .maybeSingle();
  if (error || !data?.id) return null;
  return data.id;
}

async function uploadOwnedObject(
  bucket: StorageBucket,
  ownerId: string,
  file: File,
  prefix: string,
  projectId?: string | null,
  contentType?: string,
  forcedExtension?: string
): Promise<string> {
  assertNotExecutable(file);
  const supabase = createClient();
  const extension = forcedExtension || getFileExtension(file);
  if (!extension) {
    throw new Error("Unsupported or missing file extension.");
  }
  const fileName = `${prefix}-${crypto.randomUUID()}.${extension}`;
  const scopeId = await resolveProjectUuidForStorage(projectId);
  const path = buildOwnedObjectPath(ownerId, fileName, scopeId);

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: contentType || file.type || "application/octet-stream",
    cacheControl: "3600",
    headers: DOCUMENT_MIME.has(contentType || file.type)
      ? { "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"` }
      : undefined,
  });
  if (error) throw new Error(error.message);

  return durableObjectUrl(bucket, path);
}

export async function resolveStorageAccessUrl(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Non-storage URLs (data:, blob:, external http(s) without /storage/) pass through.
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    !trimmed.includes("/storage/v1/object/")
  ) {
    return trimmed;
  }

  const parsed = parseStorageObjectUrl(trimmed);
  if (!parsed) return "";

  if (!isPrivateStorageBucket(parsed.bucket)) {
    return durableObjectUrl(parsed.bucket, parsed.path);
  }

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    return "";
  }
  return data.signedUrl;
}

export async function uploadImage(
  bucket: StorageBucket,
  ownerId: string,
  file: File,
  prefix = "image",
  projectId?: string | null
): Promise<string> {
  await assertImageFile(file);
  const form = new FormData();
  form.set("bucket", bucket);
  form.set("prefix", prefix);
  form.set("file", file);
  if (projectId?.trim()) form.set("projectId", projectId.trim());

  const response = await fetch("/auth/uploads/promote", {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });
  const body = (await response.json().catch(() => null)) as
    | { ok?: boolean; url?: string; error?: string }
    | null;
  if (!response.ok || !body?.ok || !body.url) {
    if (body?.error === "too_large") throw new Error("Image is too large.");
    if (body?.error === "invalid_type") throw new Error("Only JPEG, PNG, or WebP images are allowed.");
    if (body?.error === "too_many_pixels") throw new Error("Image dimensions are too large.");
    throw new Error("That image could not be uploaded. Try a smaller JPEG, PNG, or WebP file.");
  }
  void ownerId;
  return body.url;
}

export async function uploadStorageFile(
  bucket: StorageBucket,
  ownerId: string,
  file: File,
  prefix = "file",
  projectId?: string | null
): Promise<string> {
  assertMessageAttachmentFile(file);
  assertNotExecutable(file);
  if (!IMAGE_MIME.has(file.type) && !DOCUMENT_MIME.has(file.type)) {
    throw new Error("Supported files: images, PDF, Word, Excel, or TXT (max 10MB).");
  }
  return uploadOwnedObject(bucket, ownerId, file, prefix, projectId, file.type);
}

export async function uploadAvatarImage(userId: string, file: File) {
  return uploadImage(STORAGE_BUCKETS.avatars, userId, file, "avatar");
}

/** Intentionally public marketplace imagery (separate public bucket). */
export async function uploadDesignerCoverImage(userId: string, file: File) {
  return uploadImage(STORAGE_BUCKETS.designerPortfolios, userId, file, "cover");
}

/** Intentionally public marketplace imagery (separate public bucket). */
export async function uploadDesignerPortfolioImage(userId: string, file: File) {
  return uploadImage(STORAGE_BUCKETS.designerPortfolios, userId, file, "portfolio");
}

export async function uploadCustomerReferenceImage(
  userId: string,
  file: File,
  projectId?: string | null
) {
  return uploadImage(STORAGE_BUCKETS.customerInspiration, userId, file, "reference", projectId);
}

/**
 * Public marketplace testimonial photos — published into the public portfolios bucket,
 * never the private customer-inspiration bucket.
 */
export async function uploadTestimonialPhoto(userId: string, file: File) {
  return uploadImage(STORAGE_BUCKETS.designerPortfolios, userId, file, "testimonial");
}

export async function uploadProjectReferenceImage(
  userId: string,
  file: File,
  projectId?: string | null
) {
  return uploadImage(STORAGE_BUCKETS.projectReferences, userId, file, "project-ref", projectId);
}

export async function uploadProjectProgressImage(
  userId: string,
  file: File,
  projectId?: string | null
) {
  return uploadImage(STORAGE_BUCKETS.projectProgress, userId, file, "progress", projectId);
}

export async function uploadMessageAttachment(
  userId: string,
  file: File,
  projectId?: string | null
) {
  return uploadStorageFile(STORAGE_BUCKETS.messageAttachments, userId, file, "message", projectId);
}

/** @deprecated Use uploadMessageAttachment */
export async function uploadMessageAttachmentImage(userId: string, file: File) {
  return uploadMessageAttachment(userId, file);
}
