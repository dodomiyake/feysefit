import type { Testimonial, TestimonialReport } from "@/lib/testimonials";
import { designerReviews } from "@/lib/designer-reviews";

const STORAGE_KEY = "feysefit_testimonials";
const REPORTS_KEY = "feysefit_testimonial_reports";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function seedTestimonials(): Testimonial[] {
  return designerReviews.map((review) => ({
    id: review.id,
    projectId: `demo-project-${review.id}`,
    customerId: "2",
    designerId: review.designerId,
    rating: review.rating,
    body: review.quote,
    outfitType: "gown",
    allowPublic: true,
    showName: true,
    showLocation: true,
    displayName: review.author,
    displayLocation: review.location,
    status: "active",
    verified: true,
    createdAt: new Date().toISOString(),
  }));
}

export function readTestimonialsFromStorage(): Testimonial[] {
  const stored = readJson<Testimonial[]>(STORAGE_KEY, []);
  if (stored.length > 0) return stored;
  const seeded = seedTestimonials();
  writeJson(STORAGE_KEY, seeded);
  return seeded;
}

export function writeTestimonialsToStorage(items: Testimonial[]) {
  writeJson(STORAGE_KEY, items);
}

export function readTestimonialReportsFromStorage(): TestimonialReport[] {
  return readJson<TestimonialReport[]>(REPORTS_KEY, []);
}

export function writeTestimonialReportsToStorage(items: TestimonialReport[]) {
  writeJson(REPORTS_KEY, items);
}
