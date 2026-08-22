import type { UserRole } from "@/lib/design-tokens";

export type AuthRequirement =
  | { type: "public" }
  | { type: "authenticated" }
  | { type: "role"; roles: UserRole[] };

const PUBLIC_EXACT = new Set([
  "/",
  "/privacy",
  "/terms",
  "/login",
  "/login/admin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/logout",
  "/auth/activity",
  "/auth/session/start",
  "/auth/reauth",
  "/auth/security-event",
]);

const PUBLIC_PREFIXES = [
  "/auth/callback",
  "/join/",
  "/api/",
  "/account/",
  "/signup/",
  "/_next/",
  "/__nextjs",
];

function isMarketplacePublic(pathname: string): boolean {
  if (!pathname.startsWith("/marketplace")) return false;
  return !pathname.includes("/request");
}

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  if (isMarketplacePublic(pathname)) return true;
  return false;
}

export function getAuthRequirement(pathname: string): AuthRequirement {
  if (isPublicPath(pathname)) {
    return { type: "public" };
  }

  if (pathname.startsWith("/dashboard/admin")) {
    return { type: "role", roles: ["admin"] };
  }
  if (pathname.startsWith("/dashboard/designer")) {
    return { type: "role", roles: ["designer"] };
  }
  if (pathname.startsWith("/dashboard/customer")) {
    return { type: "role", roles: ["customer"] };
  }
  if (pathname.startsWith("/clients")) {
    return { type: "role", roles: ["designer"] };
  }
  if (pathname.startsWith("/invite")) {
    return { type: "role", roles: ["designer"] };
  }
  if (pathname === "/projects/new") {
    return { type: "role", roles: ["designer"] };
  }
  if (pathname.startsWith("/onboarding/designer")) {
    return { type: "role", roles: ["designer"] };
  }
  if (pathname.startsWith("/onboarding/customer")) {
    return { type: "role", roles: ["customer"] };
  }
  if (pathname === "/measurements" || pathname.startsWith("/measurements/")) {
    return { type: "role", roles: ["customer"] };
  }
  if (pathname.includes("/marketplace/") && pathname.endsWith("/request")) {
    return { type: "role", roles: ["customer"] };
  }

  if (
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/onboarding/") ||
    pathname.startsWith("/appointments") ||
    pathname.startsWith("/my-appointments") ||
    pathname.startsWith("/my-designer") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/auth/mfa")
  ) {
    return { type: "authenticated" };
  }

  // Unknown app pages require sign-in by default (safer than public).
  return { type: "authenticated" };
}

export function loginPathForRequirement(
  pathname: string,
  requirement: AuthRequirement
): string {
  if (requirement.type === "role" && requirement.roles.includes("admin")) {
    return "/login/admin";
  }
  if (pathname.startsWith("/dashboard/admin")) {
    return "/login/admin";
  }
  const next = encodeURIComponent(pathname);
  return `/login?next=${next}`;
}

export function isRoleAllowed(
  requirement: AuthRequirement,
  role: UserRole | null | undefined
): boolean {
  if (requirement.type === "public") return true;
  if (!role) return false;
  if (requirement.type === "authenticated") return true;
  return requirement.roles.includes(role);
}

export function dashboardForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/dashboard/admin";
    case "designer":
      return "/dashboard/designer";
    case "customer":
      return "/dashboard/customer";
  }
}

export function resolveSafeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  const requirement = getAuthRequirement(next);
  if (requirement.type === "public" && !next.startsWith("/dashboard")) {
    return next;
  }
  if (requirement.type !== "public") {
    return next;
  }
  return null;
}
