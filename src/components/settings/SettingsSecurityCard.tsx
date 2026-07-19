"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import {
  hasVerifiedTotp,
  mfaPolicyForRole,
} from "@/lib/services/mfaService";
import { Eye, Lock, Store, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface SettingsSecurityCardProps {
  twoFactorEnabled: boolean;
  onTwoFactorChange: (value: boolean) => void;
  profileVisibility: "connections" | "everyone";
  onProfileVisibilityChange: (value: "connections" | "everyone") => void;
  isDesigner: boolean;
  showProfileVisibility?: boolean;
  className?: string;
  marketplaceVisible: boolean;
  marketplacePending: boolean;
  onMarketplaceChange: (visible: boolean) => void;
}

function SecurityRow({
  icon: Icon,
  title,
  description,
  control,
}: {
  icon: typeof Lock;
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#d3c3ba]/25 bg-background">
          <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-base font-medium text-primary">{title}</p>
          <p className="text-xs text-ink-muted">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export function SettingsSecurityCard({
  twoFactorEnabled,
  onTwoFactorChange,
  profileVisibility,
  onProfileVisibilityChange,
  isDesigner,
  showProfileVisibility = true,
  className,
  marketplaceVisible,
  marketplacePending,
  onMarketplaceChange,
}: SettingsSecurityCardProps) {
  const { role } = useApp();
  const useSupabase = isSupabaseEnabled();
  const policy = mfaPolicyForRole(role);
  const [enrolled, setEnrolled] = useState(twoFactorEnabled);
  const [checkingMfa, setCheckingMfa] = useState(useSupabase);
  const visibilityLabel = profileVisibility === "connections" ? "Connections" : "Everyone";

  const refreshMfa = useCallback(async () => {
    if (!useSupabase) {
      setEnrolled(twoFactorEnabled);
      setCheckingMfa(false);
      return;
    }
    try {
      const ok = await hasVerifiedTotp();
      setEnrolled(ok);
      if (ok !== twoFactorEnabled) onTwoFactorChange(ok);
    } catch {
      setEnrolled(false);
    } finally {
      setCheckingMfa(false);
    }
  }, [onTwoFactorChange, twoFactorEnabled, useSupabase]);

  useEffect(() => {
    void refreshMfa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useSupabase]);

  const mfaDescription = checkingMfa
    ? "Checking authenticator status…"
    : enrolled
      ? "Authenticator app enabled — manage on Account security"
      : policy.required
        ? "Required — finish setup on Account security"
        : "Password, MFA, sessions & activity";

  return (
    <section
      className={cn(
        "rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md lg:p-8",
        className ?? "lg:col-span-5"
      )}
    >
      <h2 className="mb-6 font-headline text-xl font-semibold text-primary">Security & Privacy</h2>

      <div className="space-y-6">
        <SecurityRow
          icon={Shield}
          title="Account security"
          description={mfaDescription}
          control={
            <Link href="/settings/security">
              <Button type="button" size="sm">
                Manage
              </Button>
            </Link>
          }
        />

        {!useSupabase ? (
          <SecurityRow
            icon={Lock}
            title="Two-Factor Auth"
            description="Local demo toggle"
            control={<Toggle checked={twoFactorEnabled} onChange={onTwoFactorChange} />}
          />
        ) : null}

        {showProfileVisibility && (
          <SecurityRow
            icon={Eye}
            title="Profile Visibility"
            description="Who can find you"
            control={
              <button
                type="button"
                onClick={() =>
                  onProfileVisibilityChange(
                    profileVisibility === "connections" ? "everyone" : "connections"
                  )
                }
                className="text-sm font-medium text-ink-muted transition-colors hover:text-primary"
              >
                {visibilityLabel}
              </button>
            }
          />
        )}

        {isDesigner && (
          <SecurityRow
            icon={Store}
            title="Marketplace visibility"
            description={
              marketplacePending
                ? "Listing pending admin approval"
                : "Show your profile on the public marketplace"
            }
            control={<Toggle checked={marketplaceVisible} onChange={onMarketplaceChange} />}
          />
        )}
      </div>
    </section>
  );
}
