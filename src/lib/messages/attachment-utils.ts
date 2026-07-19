import type { MessageAttachment } from "@/lib/conversations";
import { STORAGE_DOCUMENT_TYPES, STORAGE_IMAGE_TYPES } from "@/lib/storage/buckets";

export const MAX_MESSAGE_ATTACHMENTS = 5;

export const MESSAGE_FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.txt,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const IMAGE_TYPES = new Set<string>(STORAGE_IMAGE_TYPES);
const DOCUMENT_TYPES = new Set<string>(STORAGE_DOCUMENT_TYPES);
const DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "txt"]);
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
  "dll",
  "apk",
  "jar",
  "html",
  "htm",
  "svg",
]);

export function getAttachmentType(file: File): MessageAttachment["type"] {
  if (IMAGE_TYPES.has(file.type)) return "image";
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  return "document";
}

export function assertMessageAttachmentFile(file: File) {
  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase()
    : undefined;

  if (extension && BLOCKED_EXTENSIONS.has(extension)) {
    throw new Error("This file type is not allowed.");
  }

  const isImage = IMAGE_TYPES.has(file.type);
  const isDocument =
    DOCUMENT_TYPES.has(file.type) || (extension ? DOCUMENT_EXTENSIONS.has(extension) : false);

  if (!isImage && !isDocument) {
    throw new Error("Supported files: images, PDF, Word, Excel, or TXT (max 10MB).");
  }

  const maxBytes = isImage ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(isImage ? "Images must be 5MB or smaller." : "Documents must be 10MB or smaller.");
  }
}
