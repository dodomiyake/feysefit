import { isLocalDemoMode } from "@/lib/config/backend";

export interface PortfolioPiece {
  image: string;
  title: string;
  subtitle?: string;
  layout: "large" | "tall" | "small";
}

export interface GalleryPiece {
  image: string;
  title: string;
  subtitle?: string;
  collection?: string;
}

export interface DesignerProfileMeta {
  yearsExperience: number;
  designsCount: number;
  specialtyTags: string[];
  philosophyQuote: string;
  signature: string;
  portfolio: PortfolioPiece[];
  gallery: GalleryPiece[];
}

export const designerProfileMeta: Record<string, DesignerProfileMeta> = {
  "1": {
    yearsExperience: 12,
    designsCount: 47,
    specialtyTags: ["Aso-ebi", "Bridal"],
    philosophyQuote:
      "Luxury is not merely about the fabric—it is about the architecture of the silhouette. Every garment I create is a dialogue between the wearer's body and the craft of tailoring, ensuring the perfect fit is a tactile reality.",
    signature: "A. Okonkwo",
    portfolio: [
      {
        image: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80",
        title: "Emerald Aso-Ebi",
        subtitle: "Diaspora Wedding 2024",
        layout: "large",
      },
      {
        image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&q=80",
        title: "Cathedral Bridal",
        subtitle: "Bespoke Gown",
        layout: "tall",
      },
      {
        image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&q=80",
        title: "Beaded Bodice",
        layout: "small",
      },
      {
        image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80",
        title: "Silk Draping",
        layout: "small",
      },
    ],
    gallery: [
      {
        image: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80",
        title: "Emerald Aso-Ebi",
        subtitle: "Diaspora Wedding 2024",
        collection: "Bridal & Aso-ebi",
      },
      {
        image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&q=80",
        title: "Cathedral Bridal",
        subtitle: "Bespoke Gown",
        collection: "Bridal & Aso-ebi",
      },
      {
        image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&q=80",
        title: "Beaded Bodice",
        subtitle: "Hand-finished detail",
        collection: "Bridal & Aso-ebi",
      },
      {
        image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80",
        title: "Silk Draping",
        subtitle: "Evening silhouette",
        collection: "Evening Wear",
      },
      {
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80",
        title: "Pearl Reception Gown",
        subtitle: "Lagos debutante ball",
        collection: "Evening Wear",
      },
      {
        image: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80",
        title: "Family Aso-ebi Suite",
        subtitle: "Coordinated palette",
        collection: "Bridal & Aso-ebi",
      },
      {
        image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&q=80",
        title: "Ivory Train Detail",
        subtitle: "Cathedral length",
        collection: "Bridal & Aso-ebi",
      },
      {
        image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80",
        title: "Crystal Embroidery",
        subtitle: "Bodice study",
        collection: "Couture Details",
      },
    ],
  },
  "2": {
    yearsExperience: 9,
    designsCount: 32,
    specialtyTags: ["Menswear", "Kaftans"],
    philosophyQuote:
      "Contemporary African menswear should honour tradition without sacrificing modern structure. Each piece is tailored to move with the wearer—from agbada ceremonies to boardroom-ready suits.",
    signature: "K. Mensah",
    portfolio: [
      {
        image: "https://images.unsplash.com/photo-1593030761757-71cae45d48e7?w=800&q=80",
        title: "Structural Navy",
        subtitle: "Bespoke Suit",
        layout: "large",
      },
      {
        image: "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=600&q=80",
        title: "Kente Agbada",
        subtitle: "Formal Collection",
        layout: "tall",
      },
      {
        image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&q=80",
        title: "Heritage Weave",
        layout: "small",
      },
      {
        image: "https://images.unsplash.com/photo-1593030761757-71cae45d48e7?w=500&q=80",
        title: "Tailored Kaftan",
        layout: "small",
      },
    ],
    gallery: [
      {
        image: "https://images.unsplash.com/photo-1593030761757-71cae45d48e7?w=800&q=80",
        title: "Structural Navy",
        subtitle: "Bespoke Suit",
        collection: "Menswear",
      },
      {
        image: "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=600&q=80",
        title: "Kente Agbada",
        subtitle: "Formal Collection",
        collection: "Traditional",
      },
      {
        image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&q=80",
        title: "Heritage Weave",
        subtitle: "Textile study",
        collection: "Traditional",
      },
      {
        image: "https://images.unsplash.com/photo-1593030761757-71cae45d48e7?w=500&q=80",
        title: "Tailored Kaftan",
        subtitle: "Summer ceremony",
        collection: "Kaftans",
      },
      {
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
        title: "Double-breasted Navy",
        subtitle: "Boardroom bespoke",
        collection: "Menswear",
      },
      {
        image: "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=500&q=80",
        title: "Gold-thread Agbada",
        subtitle: "Wedding commission",
        collection: "Traditional",
      },
      {
        image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80",
        title: "Heritage Blazer",
        subtitle: "Kente lapel accent",
        collection: "Menswear",
      },
    ],
  },
  "3": {
    yearsExperience: 10,
    designsCount: 28,
    specialtyTags: ["Occasion Wear", "Gowns"],
    philosophyQuote:
      "Elegant occasion wear should celebrate the moment and the person wearing it. I blend North American glamour with couture finishing so every gown feels effortless and unforgettable.",
    signature: "A. Diallo",
    portfolio: [
      {
        image: "https://images.unsplash.com/photo-1595776613210-53d8d84e24b3?w=800&q=80",
        title: "The Celestial Gown",
        subtitle: "Gala Collection",
        layout: "large",
      },
      {
        image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80",
        title: "Sunset Silk",
        subtitle: "Evening Wear",
        layout: "tall",
      },
      {
        image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&q=80",
        title: "Embroidery Detail",
        layout: "small",
      },
      {
        image: "https://images.unsplash.com/photo-1595776613210-53d8d84e24b3?w=500&q=80",
        title: "Architectural Drape",
        layout: "small",
      },
    ],
    gallery: [
      {
        image: "https://images.unsplash.com/photo-1595776613210-53d8d84e24b3?w=800&q=80",
        title: "The Celestial Gown",
        subtitle: "Gala Collection",
        collection: "Evening Gowns",
      },
      {
        image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80",
        title: "Sunset Silk",
        subtitle: "Evening Wear",
        collection: "Evening Gowns",
      },
      {
        image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&q=80",
        title: "Embroidery Detail",
        subtitle: "Couture finishing",
        collection: "Couture Details",
      },
      {
        image: "https://images.unsplash.com/photo-1595776613210-53d8d84e24b3?w=500&q=80",
        title: "Architectural Drape",
        subtitle: "Sculpted silhouette",
        collection: "Evening Gowns",
      },
      {
        image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=80",
        title: "Rose Quartz Gala",
        subtitle: "Toronto charity ball",
        collection: "Occasion Wear",
      },
      {
        image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=500&q=80",
        title: "Sunset Bias Cut",
        subtitle: "Fluid evening line",
        collection: "Evening Gowns",
      },
      {
        image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80",
        title: "Beaded Hemline",
        subtitle: "Hand-set crystals",
        collection: "Couture Details",
      },
    ],
  },
};

export function getDesignerProfileMeta(designerId: string): DesignerProfileMeta | null {
  if (!isLocalDemoMode()) return null;
  return designerProfileMeta[designerId] ?? null;
}

export function getDesignerPortfolioGallery(
  designerId: string,
  portfolioImages: string[]
): GalleryPiece[] {
  const meta = getDesignerProfileMeta(designerId);
  if (meta?.gallery.length) return meta.gallery;

  return portfolioImages.map((image, i) => ({
    image,
    title: `Collection ${i + 1}`,
    collection: "Portfolio",
  }));
}
