import type { ProjectStatus } from "./design-tokens";
import type { CustomerReference } from "./customer-references";
import type {
  DeliveryMethod,
  LocalDeliveryStatus,
  MeasurementRecordedBy,
} from "./local-customer";

export interface ProjectTeamMember {
  name: string;
  avatar: string;
  role: string;
}

export interface Project {
  id: string;
  projectCode: string;
  paletteId: string;
  title: string;
  customerName: string;
  customerId?: string;
  outfitType: string;
  deadline: string;
  budget: string;
  status: ProjectStatus;
  referenceImages: string[];
  customerReferences?: CustomerReference[];
  customerUpdate: string;
  designerUpdate?: string;
  internalNotes: string;
  description?: string;
  measurements?: Record<string, string>;
  galleryImages?: string[];
  primaryFabric?: string;
  secondaryMaterial?: string;
  lining?: string;
  designerFabricAdvice?: string;
  startedDate?: string;
  estimatedDelivery?: string;
  measurementFitNote?: string;
  teamMembers?: ProjectTeamMember[];
  lastUpdated?: string;
  createdAt?: string;
  designerId?: string;
  designerName?: string;
  updatedAt?: string;
  studioClientId?: string;
  groupProjectId?: string;
  deliveryMethod?: DeliveryMethod;
  localDeliveryStatus?: LocalDeliveryStatus;
  firstFittingAt?: string;
  secondFittingAt?: string;
  finalFittingAt?: string;
  fittingNotes?: string;
  adjustmentNotes?: string;
  totalPrice?: number;
  depositPaid?: number;
  paymentMethod?: string;
  paymentNotes?: string;
  measurementRecordedBy?: MeasurementRecordedBy;
  /** Garments / clothing items within this commission. */
  items?: import("@/lib/project-items").ProjectItem[];
  relationshipArchivedAt?: string;
}

export interface Designer {
  id: string;
  businessName: string;
  designerName: string;
  location: string;
  specialty: string;
  bio: string;
  tagline?: string;
  serviceAreas?: string[];
  phone?: string;
  rating: number;
  reviewCount: number;
  portfolioImages: string[];
  coverImage: string;
  profileImage: string;
  createdAt?: string;
  city?: string;
  country?: string;
  offersInPersonAppointments?: boolean;
  offeredMeetingModes?: import("@/lib/local-customer").MeetingMode[];
  appointmentSlotMinutes?: number;
  priceRangeMin?: number;
  priceRangeMax?: number;
  yearsExperience?: number;
}

export interface Customer {
  id: string;
  name: string;
  location: string;
  phone: string;
  email: string;
  projectCount: number;
  profileImage?: string;
  createdAt?: string;
}

export interface Message {
  id: string;
  sender: "designer" | "customer";
  senderName: string;
  text: string;
  timestamp: string;
}

export interface PendingInvite {
  id: string;
  code: string;
  name: string;
  email: string;
  projectType: string;
  sentAt: string;
  sentAgo: string;
  status: "pending" | "accepted";
}

export const designers: Designer[] = [
  {
    id: "1",
    businessName: "Adaeze Atelier",
    designerName: "Adaeze Okonkwo",
    location: "Lagos, Nigeria",
    specialty: "Aso-ebi & Bridal",
    bio: "Specialising in bespoke aso-ebi coordination and luxury bridal gowns for diaspora weddings. Over 12 years crafting memorable occasion wear.",
    tagline: "Precision is a love language.",
    serviceAreas: ["Local fittings", "International shipping"],
    city: "Lagos",
    country: "Nigeria",
    offersInPersonAppointments: true,
    priceRangeMin: 800,
    priceRangeMax: 4500,
    rating: 4.9,
    reviewCount: 47,
    yearsExperience: 12,
    coverImage: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80",
    profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
    portfolioImages: [
      "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400&q=80",
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&q=80",
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80",
    ],
  },
  {
    id: "2",
    businessName: "Kente & Co.",
    designerName: "Kwame Mensah",
    location: "London, UK",
    specialty: "Menswear & Kaftans",
    bio: "Contemporary African menswear blending traditional kente with modern tailoring for UK and international clients.",
    serviceAreas: ["Nationwide delivery", "Virtual consultations"],
    city: "London",
    country: "UK",
    offersInPersonAppointments: true,
    priceRangeMin: 600,
    priceRangeMax: 3200,
    rating: 4.8,
    reviewCount: 32,
    yearsExperience: 9,
    coverImage: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
    profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    portfolioImages: [
      "https://images.unsplash.com/photo-1593030761757-71cae45d48e7?w=400&q=80",
      "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=400&q=80",
    ],
  },
  {
    id: "3",
    businessName: "Elegance by Amara",
    designerName: "Amara Diallo",
    location: "Toronto, Canada",
    specialty: "Occasion Wear & Gowns",
    bio: "Elegant occasion wear and custom gowns for weddings, galas, and cultural celebrations across North America.",
    serviceAreas: ["Local fittings", "Virtual consultations"],
    rating: 4.7,
    reviewCount: 28,
    yearsExperience: 10,
    coverImage: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80",
    profileImage: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80",
    portfolioImages: [
      "https://images.unsplash.com/photo-1595776613210-53d8d84e24b3?w=400&q=80",
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80",
    ],
  },
];

export const projects: Project[] = [
  {
    id: "1",
    projectCode: "FF-2024-091",
    paletteId: "silk-aso-ebi",
    title: "Silk Aso-Ebi Gown",
    customerName: "Chioma Adeyemi",
    outfitType: "Aso-ebi Coordination",
    deadline: "Aug 15, 2026",
    budget: "£1,200",
    status: "In Production",
    referenceImages: [
      "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=300&q=80",
    ],
    customerReferences: [
      {
        id: "cr-seed-1",
        url: "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=600&q=80",
        category: "style",
        caption: "Structured bodice with soft draping on the skirt",
        uploadedAt: "Jun 26, 2026",
      },
      {
        id: "cr-seed-2",
        url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80",
        category: "fabric",
        caption: "Emerald silk with a subtle sheen",
        uploadedAt: "Jun 27, 2026",
      },
    ],
    galleryImages: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCnP3qCv665Et8U0qNNsgZzvm-TxPIGdpfO8PN76BG9rZWnIrL54Rg6-pLYh3NB2LmgZ6ED2718JWLUAupDW6LwVpRuFz7O_UvETjS8YmD-4SaBDVBoUy2SG0DyqFBX8BxveCe-AIt88Ef38oMRgYqlcBA2GFZYZx6w3h4qcPDKrAYS1FrZPd5hXqJ54Rdi53Wqg8OcoOta5S1MIG9sYQmwbixo2zMA1RjA1_RKsBXm66zW9dBDCyJPmhCnY7Sf0WSooWIvWZYb4A",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDXj4AvnpUwXuoAudjZqJXJ-EABo8ITDwPhntcOXi3Ddj6mRA4Uw4ja8hdH1spNLP_ciWLiidrvMnMvVEnZDzEAuk3jmpfXHdjyL41sx3aTdcIcpeb6SxBPAvZDtqZrVkc1zJOpgHaB77ZlTDzlp9eqNrVE4FNmc0HBdKLLwBQlo3zNbYiZpLsw4UKRYUjmKm2qYl2Wgm99txzwYmqIkQHUkHjX8HWcI4_4vKZTaFECziw-2HvzDguS8Ks0kaOjhsf7PnaiHgD3Ow",
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80",
    ],
    primaryFabric: "Italian silk charmeuse — emerald",
    secondaryMaterial: "Gold metallic thread embroidery",
    lining: "Silk organza",
    startedDate: "Mar 12, 2026",
    estimatedDelivery: "Aug 15, 2026",
    measurementFitNote: "Structured bodice with 0.5\" ease on waist per fitting notes.",
    lastUpdated: "June 28, 2026",
    teamMembers: [
      {
        name: "Adaeze Okonkwo",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
        role: "Lead Designer",
      },
      {
        name: "Kemi Oladipo",
        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80",
        role: "Pattern Maker",
      },
      {
        name: "Tolu Adeyemi",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
        role: "Master Tailor",
      },
    ],
    customerUpdate: "Your emerald green fabric has been sourced. First fitting scheduled for next week.",
    internalNotes: "Customer prefers structured bodice. Add 0.5\" ease on waist.",
    measurements: { chest: "38\"", waist: "32\"", hips: "42\"", height: "5'7\"" },
  },
  {
    id: "2",
    projectCode: "FF-2024-088",
    paletteId: "silk-aso-ebi",
    title: "Royal Agbada Ensemble",
    customerName: "Tunde Bakare",
    outfitType: "Agbada",
    deadline: "Sep 2, 2026",
    budget: "£850",
    status: "Measurements Needed",
    referenceImages: [],
    customerUpdate: "Please submit your measurements so we can begin your custom agbada.",
    internalNotes: "",
  },
  {
    id: "3",
    projectCode: "FF-2024-082",
    paletteId: "silk-gala-gown",
    title: "Silk Gala Gown",
    customerName: "Fatima Hassan",
    outfitType: "Bridal",
    deadline: "Oct 20, 2026",
    budget: "£2,400",
    status: "Design Confirmed",
    referenceImages: [
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=300&q=80",
    ],
    startedDate: "May 3, 2026",
    estimatedDelivery: "Oct 20, 2026",
    primaryFabric: "Duchess satin — ivory",
    secondaryMaterial: "Hand-beaded lace appliqué",
    lining: "Cotton sateen",
    lastUpdated: "June 22, 2026",
    customerUpdate: "Design sketches approved! Moving to pattern drafting.",
    internalNotes: "Cathedral train, beaded bodice, illusion neckline.",
    measurements: { chest: "36\"", waist: "28\"", hips: "40\"", height: "5'5\"" },
  },
];

export const customers: Customer[] = [
  { id: "1", name: "Chioma Adeyemi", location: "Manchester, UK", phone: "+44 7700 900123", email: "chioma.a@email.com", projectCount: 2 },
  { id: "2", name: "Tunde Bakare", location: "Houston, US", phone: "+1 713 555 0142", email: "tunde.b@email.com", projectCount: 1 },
  { id: "3", name: "Fatima Hassan", location: "Toronto, CA", phone: "+1 416 555 0198", email: "fatima.h@email.com", projectCount: 1 },
  { id: "4", name: "Ngozi Eze", location: "Abuja, Nigeria", phone: "+234 803 555 0100", email: "ngozi.e@email.com", projectCount: 3 },
];

export const messages: Message[] = [
  {
    id: "1",
    sender: "designer",
    senderName: "Adaeze Okonkwo",
    text: "Hi Chioma! I've received your measurements. Everything looks good — I'll start on the pattern this week.",
    timestamp: "10:32 AM",
  },
  {
    id: "2",
    sender: "customer",
    senderName: "Chioma Adeyemi",
    text: "Thank you! Can we add a small train to the skirt? About 12 inches would be perfect.",
    timestamp: "10:45 AM",
  },
  {
    id: "3",
    sender: "designer",
    senderName: "Adaeze Okonkwo",
    text: "Absolutely — a 12\" train will look stunning with the emerald fabric. I'll update the design and send revised sketches tomorrow.",
    timestamp: "11:02 AM",
  },
];

export const pendingInvites: PendingInvite[] = [
  {
    id: "1",
    code: "FF-DEMO01",
    name: "Amina Yusuf",
    email: "amina.y@email.com",
    projectType: "Kaftan",
    sentAt: "Jun 28, 2026",
    sentAgo: "2 days ago",
    status: "pending",
  },
  {
    id: "2",
    code: "FF-DEMO02",
    name: "David Okafor",
    email: "david.o@email.com",
    projectType: "Agbada",
    sentAt: "Jun 25, 2026",
    sentAgo: "5 hours ago",
    status: "pending",
  },
  {
    id: "3",
    code: "FF-DEMO03",
    name: "Ngozi Eze",
    email: "ngozi.e@email.com",
    projectType: "Bespoke",
    sentAt: "Jun 27, 2026",
    sentAgo: "Yesterday",
    status: "pending",
  },
];

export const measurementFields = [
  { key: "height", label: "Height", helper: "Stand straight against a wall. Measure from floor to top of head." },
  { key: "chest", label: "Chest / Bust", helper: "Measure around the fullest part of your chest, keeping tape parallel to floor." },
  { key: "waist", label: "Waist", helper: "Measure around your natural waistline — the narrowest part of your torso." },
  { key: "hips", label: "Hips", helper: "Measure around the fullest part of your hips and buttocks." },
  { key: "shoulder", label: "Shoulder", helper: "Measure from one shoulder edge to the other across your back." },
  { key: "sleeve", label: "Sleeve Length", helper: "From shoulder seam down to where you want the cuff to end." },
  { key: "trouser", label: "Trouser Length", helper: "From waist to desired hem length along the outside of your leg." },
  { key: "neck", label: "Neck", helper: "Measure around the base of your neck where a collar would sit." },
  { key: "armhole", label: "Armhole", helper: "Measure around your shoulder and underarm in a circle." },
  { key: "wrist", label: "Wrist", helper: "Measure around your wrist where a cuff would sit." },
  { key: "thigh", label: "Thigh", helper: "Measure around the fullest part of your upper thigh." },
  { key: "inseam", label: "Inseam", helper: "From crotch to ankle along the inside of your leg." },
];
