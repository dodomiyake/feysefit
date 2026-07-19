import { getPublicTestimonials, summarizeTestimonialRatings, type Testimonial } from "@/lib/testimonials";
import { isLocalDemoMode } from "@/lib/config/backend";

export interface DesignerReview {
  id: string;
  designerId: string;
  rating: number;
  quote: string;
  author: string;
  location: string;
  outfitType?: string;
  photoUrl?: string;
  verified?: boolean;
}

export const designerReviews: DesignerReview[] = [
  {
    id: "r1-1",
    designerId: "1",
    rating: 5,
    quote:
      "Adaeze created the most beautiful aso-ebi for our family wedding. Despite being in the UK, the remote measurement process was seamless.",
    author: "Amaka O.",
    location: "London",
    outfitType: "aso-ebi",
    verified: true,
  },
  {
    id: "r1-2",
    designerId: "1",
    rating: 5,
    quote:
      "Professional from first sketch to final fitting. My bridal party looked coordinated and elegant.",
    author: "Priya S.",
    location: "Birmingham",
    outfitType: "bridal",
    verified: true,
  },
  {
    id: "r2-1",
    designerId: "2",
    rating: 5,
    quote:
      "Kwame tailored the perfect agbada for my father's 70th. The kente accents were exactly what we envisioned.",
    author: "James T.",
    location: "London",
    outfitType: "agbada",
    verified: true,
  },
  {
    id: "r2-2",
    designerId: "2",
    rating: 4,
    quote: "Sharp menswear with a modern feel. Communication was clear throughout the project.",
    author: "Emmanuel K.",
    location: "Manchester",
    outfitType: "menswear",
    verified: true,
  },
  {
    id: "r3-1",
    designerId: "3",
    rating: 5,
    quote:
      "Amara designed a stunning gala gown — the fit was flawless even with remote measurements from Toronto.",
    author: "Sarah M.",
    location: "Toronto",
    outfitType: "gown",
    verified: true,
  },
];

export function mapTestimonialToDesignerReview(testimonial: Testimonial): DesignerReview {
  return {
    id: testimonial.id,
    designerId: testimonial.designerId,
    rating: testimonial.rating,
    quote: testimonial.body,
    author: testimonial.displayName,
    location: testimonial.displayLocation ?? "",
    outfitType: testimonial.outfitType,
    photoUrl: testimonial.photoUrl,
    verified: testimonial.verified,
  };
}

export function getReviewsForDesigner(designerId: string, testimonials: Testimonial[] = []) {
  const fromState = getPublicTestimonials(testimonials)
    .filter((item) => item.designerId === designerId)
    .map(mapTestimonialToDesignerReview);
  if (fromState.length > 0) return fromState;

  if (!isLocalDemoMode()) return [];
  return designerReviews.filter((review) => review.designerId === designerId);
}

export function getDesignerReviewSummary(
  designerId: string,
  testimonials: Testimonial[],
  fallbackRating = 0,
  fallbackCount = 0
) {
  const scoped = testimonials.filter((item) => item.designerId === designerId);
  const summary = summarizeTestimonialRatings(scoped);
  if (summary.count > 0) return summary;

  if (isLocalDemoMode()) {
    const demo = designerReviews.filter((review) => review.designerId === designerId);
    if (!demo.length) return { average: fallbackRating, count: fallbackCount };
    const total = demo.reduce((sum, item) => sum + item.rating, 0);
    return { average: Math.round((total / demo.length) * 10) / 10, count: demo.length };
  }

  return { average: fallbackRating, count: fallbackCount };
}
