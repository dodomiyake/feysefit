import type { AuthUser } from "@/lib/api/client";
import type { UserRole } from "@/lib/design-tokens";
import type { Customer, Designer } from "@/lib/mock-data";
import { isLocalDemoMode } from "@/lib/config/backend";
import { designers as seedDesigners } from "@/lib/mock-data";

export interface SettingsProfile {
  fullName: string;
  email: string;
  phone: string;
  professionalRole: string;
  location: string;
  avatar: string;
  yearsExperience?: string;
}

export interface SettingsBespokeSpecs {
  standardSize: string;
  bodyScanVerified: boolean;
}

export interface SettingsProfileContext {
  authUser?: AuthUser | null;
  designer?: Designer | null;
  customer?: Customer | null;
}

export function getSettingsProfile(
  role: UserRole | null,
  context: SettingsProfileContext = {}
): SettingsProfile {
  const { authUser, designer, customer } = context;

  if (role === "designer") {
    return {
      fullName: designer?.designerName ?? authUser?.name ?? "",
      email: authUser?.email ?? "",
      phone: designer?.phone ?? "",
      professionalRole: designer?.specialty ?? "Designer",
      location: designer?.location ?? "",
      avatar: designer?.profileImage ?? "",
      yearsExperience:
        designer?.yearsExperience != null ? String(designer.yearsExperience) : "",
    };
  }

  if (role === "admin") {
    return {
      fullName: authUser?.name ?? "Admin",
      email: authUser?.email ?? "",
      phone: "",
      professionalRole: "Platform Administrator",
      location: "",
      avatar: authUser?.profileImage ?? "",
    };
  }

  if (role === "customer") {
    return {
      fullName: customer?.name ?? authUser?.name ?? "",
      email: customer?.email ?? authUser?.email ?? "",
      phone: customer?.phone ?? "",
      professionalRole: "Bespoke Client",
      location: customer?.location ?? "",
      avatar: customer?.profileImage ?? "",
    };
  }

  if (isLocalDemoMode()) {
    const demoDesigner = seedDesigners[0];
    return {
      fullName: demoDesigner.designerName,
      email: "demo@feysefit.app",
      phone: "",
      professionalRole: "Designer",
      location: demoDesigner.location,
      avatar: demoDesigner.profileImage,
    };
  }

  return {
    fullName: authUser?.name ?? "",
    email: authUser?.email ?? "",
    phone: "",
    professionalRole: "",
    location: "",
    avatar: "",
  };
}

export function getSettingsBespokeSpecs(role: UserRole | null): SettingsBespokeSpecs {
  if (role === "designer") {
    return { standardSize: "Atelier master form", bodyScanVerified: false };
  }

  return { standardSize: "Not set", bodyScanVerified: false };
}

export function formatUnitLabel(unit: "inches" | "cm"): string {
  return unit === "cm" ? "Metric (cm)" : "Imperial (in)";
}
