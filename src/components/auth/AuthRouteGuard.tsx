"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  dashboardForRole,
  getAuthRequirement,
  isPublicPath,
  isRoleAllowed,
  loginPathForRequirement,
} from "@/lib/auth-routes";

interface AuthRouteGuardProps {
  children: React.ReactNode;
}

export function AuthRouteGuard({ children }: AuthRouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, authUser, hydrated } = useApp();

  const requirement = getAuthRequirement(pathname);
  const needsAuth = requirement.type !== "public";

  useEffect(() => {
    if (!hydrated || !needsAuth) return;

    if (!authUser || !role) {
      router.replace(loginPathForRequirement(pathname, requirement));
      return;
    }

    if (authUser.accountStatus === "suspended" || authUser.accountStatus === "banned") {
      router.replace("/login?error=account_disabled");
      return;
    }

    if (authUser.emailConfirmed === false && pathname !== "/verify-email") {
      router.replace(`/verify-email?email=${encodeURIComponent(authUser.email)}`);
      return;
    }

    if (!isRoleAllowed(requirement, role)) {
      router.replace(dashboardForRole(role));
    }
  }, [authUser, hydrated, needsAuth, pathname, requirement, role, router]);

  if (!needsAuth) {
    return children;
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-5">
        <p className="text-sm text-primary/60">Loading…</p>
      </div>
    );
  }

  if (
    !authUser ||
    !role ||
    authUser.accountStatus === "suspended" ||
    authUser.accountStatus === "banned" ||
    authUser.emailConfirmed === false ||
    !isRoleAllowed(requirement, role)
  ) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-5">
        <p className="text-sm text-primary/60">Redirecting…</p>
      </div>
    );
  }

  return children;
}

export function useIsProtectedPath() {
  const pathname = usePathname();
  return !isPublicPath(pathname);
}
