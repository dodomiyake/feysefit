import type { MarketplaceApproval } from "@/lib/marketplace-approvals";
import type { Designer } from "@/lib/mock-data";
import { isLocalDemoMode } from "@/lib/config/backend";
import { designers as seedDesigners } from "@/lib/mock-data";

export interface ApprovalReviewProfile {
  designerId: string;
  designerName: string;
  businessName: string;
  location: string;
  specialty: string;
  bio: string;
  email: string;
  joinedAt: string;
  completedProjects: number;
  openReports: number;
  rating: number | null;
  reviewCount: number;
  coverImage: string;
  profileImage: string;
  portfolioImages: string[];
  isRegistered: boolean;
  riskFlags: string[];
}

const externalProfiles: Record<
  string,
  Omit<
    ApprovalReviewProfile,
    "designerId" | "isRegistered" | "riskFlags" | "rating" | "reviewCount"
  >
> = {
  "ext-jv": {
    designerName: "Julian Vancore",
    businessName: "Vancore Leather",
    location: "Milan, Italy",
    specialty: "Luxe Leatherwork • Bespoke",
    bio: "Artisan leather goods and bespoke accessories. Recently applied for marketplace listing — limited platform history.",
    email: "julian.v@vancore-leather.demo",
    joinedAt: "Jun 20, 2026",
    completedProjects: 0,
    openReports: 0,
    coverImage: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
    profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    portfolioImages: [
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80",
      "https://images.unsplash.com/photo-1624222247344-550fb60583fd?w=400&q=80",
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&q=80",
    ],
  },
  "ext-er": {
    designerName: "Elena Rossi",
    businessName: "Rossi Silk Studio",
    location: "Florence, Italy",
    specialty: "Sustainable Silk • Ready-to-Wear",
    bio: "Sustainable silk ready-to-wear with traceable supply chain. First-time marketplace applicant.",
    email: "elena@rossi-silk.demo",
    joinedAt: "Jun 25, 2026",
    completedProjects: 0,
    openReports: 1,
    coverImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80",
    profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    portfolioImages: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80",
    ],
  },
};

function profileFromDesigner(designer: Designer): ApprovalReviewProfile {
  const projectCount = designer.reviewCount > 0 ? Math.min(designer.reviewCount, 12) : 0;
  return {
    designerId: designer.id,
    designerName: designer.designerName,
    businessName: designer.businessName,
    location: designer.location,
    specialty: designer.specialty,
    bio: designer.bio,
    email: `${designer.designerName.toLowerCase().replace(/\s+/g, ".")}@feysefit.demo`,
    joinedAt: "Mar 14, 2025",
    completedProjects: projectCount,
    openReports: 0,
    rating: designer.rating,
    reviewCount: designer.reviewCount,
    coverImage: designer.coverImage,
    profileImage: designer.profileImage,
    portfolioImages: designer.portfolioImages,
    isRegistered: true,
    riskFlags: [],
  };
}

function profileFromExternal(
  designerId: string,
  approval: MarketplaceApproval
): ApprovalReviewProfile | null {
  const external = externalProfiles[designerId];
  if (!external) return null;

  const riskFlags: string[] = [
    "External applicant — not yet verified on FeyseFit",
    "No completed commissions on platform",
  ];
  if (external.openReports > 0) {
    riskFlags.push(`${external.openReports} open report(s) on file`);
  }
  if (external.completedProjects === 0) {
    riskFlags.push("Zero project history — verify portfolio authenticity");
  }

  return {
    designerId,
    ...external,
    isRegistered: false,
    riskFlags,
    rating: null,
    reviewCount: 0,
    designerName: approval.designerName,
    businessName: approval.businessName,
    specialty: approval.specialty,
  };
}

export function resolveApprovalReviewProfile(
  approval: MarketplaceApproval,
  designers: Designer[] = isLocalDemoMode() ? seedDesigners : []
): ApprovalReviewProfile {
  const registered = designers.find((d) => d.id === approval.designerId);
  if (registered) return profileFromDesigner(registered);

  if (!isLocalDemoMode()) {
    return {
      designerId: approval.designerId,
      designerName: approval.designerName,
      businessName: approval.businessName,
      location: "Not provided",
      specialty: approval.specialty,
      bio: "No profile details on file. Request additional verification before approving.",
      email: "—",
      joinedAt: approval.submittedAt,
      completedProjects: 0,
      openReports: 0,
      rating: null,
      reviewCount: 0,
      coverImage: "",
      profileImage: "",
      portfolioImages: [],
      isRegistered: false,
      riskFlags: [
        "Unknown applicant — no platform profile found",
        "Manual identity verification required",
      ],
    };
  }

  const external = profileFromExternal(approval.designerId, approval);
  if (external) return external;

  return {
    designerId: approval.designerId,
    designerName: approval.designerName,
    businessName: approval.businessName,
    location: "Not provided",
    specialty: approval.specialty,
    bio: "No profile details on file. Request additional verification before approving.",
    email: "—",
    joinedAt: approval.submittedAt,
    completedProjects: 0,
    openReports: 0,
    rating: null,
    reviewCount: 0,
    coverImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    portfolioImages: [],
    isRegistered: false,
    riskFlags: [
      "Unknown applicant — no platform profile found",
      "Manual identity verification required",
    ],
  };
}

export const verificationChecklist = [
  {
    id: "identity",
    label: "Identity verified",
    description: "Designer name and account match submitted business details",
  },
  {
    id: "portfolio",
    label: "Portfolio reviewed",
    description: "Work samples appear authentic and match stated specialty",
  },
  {
    id: "business",
    label: "Business details confirmed",
    description: "Location, specialty, and business name are consistent",
  },
  {
    id: "reports",
    label: "No fraud or policy concerns",
    description: "No unresolved reports, scams, or policy violations found",
  },
] as const;

export type VerificationCheckId = (typeof verificationChecklist)[number]["id"];
