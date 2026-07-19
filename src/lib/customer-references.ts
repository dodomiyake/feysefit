export type CustomerReferenceCategory = "style" | "fabric";

export interface CustomerReference {
  id: string;
  url: string;
  category: CustomerReferenceCategory;
  caption?: string;
  uploadedAt: string;
}

export const MAX_CUSTOMER_REFERENCES = 8;
export const MAX_REFERENCE_FILE_BYTES = 900_000;

export const CUSTOMER_REFERENCE_CATEGORY_LABELS: Record<CustomerReferenceCategory, string> = {
  style: "Style inspiration",
  fabric: "Fabric & texture",
};

export const CUSTOMER_REFERENCE_UPLOAD_SAMPLES = [
  "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=600&q=80",
  "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80",
  "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&q=80",
  "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80",
] as const;

export function createCustomerReferenceId(): string {
  return `cr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatReferenceUploadDate(date = new Date()): string {
  return date.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function readReferenceImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("invalid type");
  }

  if (file.size > MAX_REFERENCE_FILE_BYTES) {
    throw new Error("Image is too large. Use a JPG or PNG under 900 KB.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("read failed"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}
