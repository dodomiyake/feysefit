import { projectOutfitTypes } from "@/lib/project-outfit-types";

export type TestimonialStatus = "active" | "hidden_by_designer" | "removed_by_admin";

export interface Testimonial {
  id: string;
  projectId: string;
  customerId: string;
  designerId: string;
  rating: number;
  body: string;
  outfitType: string;
  photoUrl?: string;
  allowPublic: boolean;
  showName: boolean;
  showLocation: boolean;
  displayName: string;
  displayLocation?: string;
  privateFeedback?: string;
  status: TestimonialStatus;
  verified: boolean;
  projectTitle?: string;
  customerName?: string;
  designerName?: string;
  requestSentAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestimonialReport {
  id: string;
  testimonialId: string;
  reporterId: string;
  reason: string;
  detail: string;
  status: "open" | "dismissed" | "resolved";
  createdAt?: string;
  testimonialBody?: string;
  designerName?: string;
}

export interface SubmitTestimonialInput {
  projectId: string;
  rating: number;
  body: string;
  outfitType: string;
  photoUrl?: string;
  allowPublic: boolean;
  showName: boolean;
  showLocation: boolean;
  privateFeedback?: string;
  customerFirstName: string;
  customerLocation?: string;
}

export interface SubmitTestimonialPayload extends SubmitTestimonialInput {
  photoFile?: File | null;
  designerLegacyId: string;
}

export function resolveOutfitTypeLabel(value: string) {
  const label = projectOutfitTypes.find((option) => option.value === value)?.label;
  return label || value || "Custom";
}

export function formatTestimonialDisplayName(firstName: string, showName: boolean) {
  const trimmed = firstName.trim();
  if (!trimmed) return "Client";
  if (showName) {
    const parts = trimmed.split(/\s+/);
    return parts[0];
  }
  const initial = trimmed.charAt(0).toUpperCase();
  const lastInitial = trimmed.includes(" ")
    ? trimmed.trim().split(/\s+/).pop()?.charAt(0).toUpperCase()
    : undefined;
  return lastInitial ? `${initial}. ${lastInitial}.` : `${initial}.`;
}

export function formatTestimonialLocation(location: string | undefined, showLocation: boolean) {
  if (!showLocation || !location?.trim()) return undefined;
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[parts.length - 1]}`;
  }
  return parts[0];
}

export function isPublicTestimonial(testimonial: Testimonial) {
  return (
    testimonial.allowPublic &&
    testimonial.status === "active"
  );
}

export function getPublicTestimonials(testimonials: Testimonial[]) {
  return testimonials.filter(isPublicTestimonial);
}

export function summarizeTestimonialRatings(testimonials: Testimonial[]) {
  const publicItems = getPublicTestimonials(testimonials);
  if (!publicItems.length) {
    return { average: 0, count: 0 };
  }
  const total = publicItems.reduce((sum, item) => sum + item.rating, 0);
  return {
    average: Math.round((total / publicItems.length) * 10) / 10,
    count: publicItems.length,
  };
}

export function getTestimonialForProject(testimonials: Testimonial[], projectId: string) {
  return testimonials.find((item) => item.projectId === projectId);
}
