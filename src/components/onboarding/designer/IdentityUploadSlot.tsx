"use client";

import { useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

interface IdentityUploadSlotProps {
  icon: LucideIcon;
  label: string;
  hint?: string;
  className?: string;
  previewUrl?: string | null;
  onFileSelected?: (file: File) => void;
  onClick?: () => void;
}

export function IdentityUploadSlot({
  icon: Icon,
  label,
  hint,
  className,
  previewUrl,
  onFileSelected,
  onClick,
}: IdentityUploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    if (onClick) {
      onClick();
      return;
    }
    inputRef.current?.click();
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFileSelected?.(file);
        }}
      />
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          "group relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#d3c3ba] bg-surface transition-colors hover:bg-surface-container",
          previewUrl && "border-solid border-accent/30 min-h-[120px]",
          className
        )}
      >
        {previewUrl ? (
          <>
            <Image src={previewUrl} alt={label} fill className="object-cover" unoptimized />
            <span className="absolute inset-x-0 bottom-0 bg-primary/70 px-2 py-1.5 text-center text-xs font-medium text-white">
              {label}
            </span>
          </>
        ) : (
          <>
            <Icon
              className="h-8 w-8 text-[#d3c3ba] transition-colors group-hover:text-primary"
              strokeWidth={1.5}
            />
            <span className="mt-2 text-sm font-medium text-ink-muted">{label}</span>
            {hint && (
              <p className="mt-1 max-w-[200px] px-3 text-center text-[10px] text-outline">{hint}</p>
            )}
          </>
        )}
      </button>
    </>
  );
}
