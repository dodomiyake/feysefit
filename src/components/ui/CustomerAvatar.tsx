"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getCustomerInitials } from "@/lib/customer-display";
import { resolveStorageAccessUrl } from "@/lib/services/storageService";
import { cn } from "@/lib/cn";

const sizeClasses = {
  sm: "h-11 w-11 text-sm",
  md: "h-14 w-14 text-sm",
  lg: "h-16 w-16 text-lg",
} as const;

interface CustomerAvatarProps {
  name: string;
  profileImage?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function CustomerAvatar({
  name,
  profileImage,
  size = "md",
  className,
}: CustomerAvatarProps) {
  const trimmed = profileImage?.trim() ?? "";
  const [resolved, setResolved] = useState("");
  const [resolvedFor, setResolvedFor] = useState("");

  useEffect(() => {
    if (!trimmed) return;

    let cancelled = false;
    void resolveStorageAccessUrl(trimmed).then((next) => {
      if (cancelled) return;
      setResolved(next);
      setResolvedFor(trimmed);
    });

    return () => {
      cancelled = true;
    };
  }, [trimmed]);

  const src = !trimmed ? "" : resolvedFor === trimmed ? resolved : trimmed;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-card",
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          className="object-cover"
          unoptimized={src.startsWith("data:") || src.startsWith("blob:")}
        />
      ) : (
        <span className="font-headline font-semibold text-primary">{getCustomerInitials(name)}</span>
      )}
    </div>
  );
}
