export const STORAGE_BUCKETS = {
  avatars: "avatars",
  designerPortfolios: "designer-portfolios",
  projectReferences: "project-references",
  projectProgress: "project-progress",
  customerInspiration: "customer-inspiration",
  measurementGuides: "measurement-guides",
  messageAttachments: "message-attachments",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export const MAX_STORAGE_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_STORAGE_FILE_BYTES = 10 * 1024 * 1024;

export const STORAGE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export const STORAGE_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
] as const;
